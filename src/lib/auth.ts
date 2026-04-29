/**
 * src/lib/auth.ts
 *
 * Utilidades de autenticación basadas en Supabase Auth.
 * Mantiene la misma API pública que la versión anterior con sesiones propias,
 * de modo que los endpoints existentes no necesitan cambios.
 *
 * Solo debe importarse en Server Components y Route Handlers (nunca en cliente).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient }  from "@/lib/supabase/server";
import { db }                          from "@/lib/db";

// ─── Caché de sesión (in-process, TTL 5s) ────────────────────────────────────
//
// Problema: requireAuth hace 3-4 queries a BD en cada llamada.
// Una página con 4 APIs = 12-16 queries solo de autenticación.
//
// Solución: cachear el resultado de las queries de BD durante 5 segundos,
// usando el supabaseId como clave (el JWT de Supabase sigue validándose
// en cada request — solo se saltean las queries de Prisma subsiguientes).
//
// En serverless, cada instancia tiene su propio Map (aislado por proceso).
// El TTL de 5s es suficiente para cubrir peticiones paralelas de una misma
// carga de página sin exponer datos obsoletos.

const DB_CACHE_TTL_MS = 5_000;

interface DbCacheEntry {
  result:    SessionData;
  timestamp: number;
}

const dbAuthCache = new Map<string, DbCacheEntry>();

function getCached(supabaseId: string): SessionData | null {
  const entry = dbAuthCache.get(supabaseId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DB_CACHE_TTL_MS) {
    dbAuthCache.delete(supabaseId);
    return null;
  }
  return entry.result;
}

function setCached(supabaseId: string, result: SessionData): void {
  dbAuthCache.set(supabaseId, { result, timestamp: Date.now() });
  // Limpieza periódica para evitar acumulación en instancias de larga vida
  if (dbAuthCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of dbAuthCache) {
      if (now - v.timestamp > DB_CACHE_TTL_MS) dbAuthCache.delete(k);
    }
  }
}

// ─── Error de autenticación ───────────────────────────────────────────────────

export class AuthError extends Error {
  status: number;
  constructor(message = "No autenticado", status = 401) {
    super(message);
    this.name   = "AuthError";
    this.status = status;
  }
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface SessionUser {
  id:            string;  // ID interno de Prisma (cuid)
  email:         string;
  name:          string;
  role:          string;
  accountStatus: string;
  emailVerified: boolean;
}

export interface SessionData {
  user:      SessionUser;
  sessionId: string;  // supabaseId — mantiene compatibilidad con el contrato anterior
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

/**
 * Obtiene el usuario autenticado desde Supabase y su registro en Prisma.
 * En el primer login, crea el registro local automáticamente (upsert).
 * Vincula cuentas conectadas huérfanas que tengan el mismo email.
 * Si no hay sesión válida, lanza AuthError(401).
 * El segundo factor (MFA) lo gestiona Supabase Auth (AAL2) antes de llegar al dashboard.
 */
export async function requireAuth(req: NextRequest): Promise<SessionData> {
  // 1. Validar JWT con Supabase (llamada de red — no se puede cachear, verifica firma)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !sbUser) {
    throw new AuthError("Sesión no válida o expirada");
  }

  if (!sbUser.email) {
    throw new AuthError("La cuenta no tiene email asociado. Usa email o Google para acceder.", 403);
  }

  // 2. Comprobar caché de BD — evita 3-4 queries en llamadas paralelas de la misma carga
  const cached = getCached(sbUser.id);
  if (cached) return cached;

  const emailVerified = !!sbUser.email_confirmed_at;

  // 3. Upsert del usuario local (solo si no está en caché)
  const user = await db.user.upsert({
    where:  { supabaseId: sbUser.id },
    create: {
      supabaseId:    sbUser.id,
      email:         sbUser.email,
      name:          (sbUser.user_metadata?.full_name as string | undefined)
                     ?? (sbUser.user_metadata?.name as string | undefined)
                     ?? sbUser.email,
      role:          "MERCHANT",
      country:       (sbUser.user_metadata?.country as string | undefined) ?? "ES",
      marketingOptIn: (sbUser.user_metadata?.marketing_opt_in as boolean | undefined) ?? false,
      accountStatus: "ONBOARDING_PENDING",
      emailVerified,
    },
    update: {
      email:        sbUser.email,
      emailVerified,
    },
  });

  // Vincular cuentas conectadas huérfanas (fire-and-forget — no bloquea la respuesta)
  db.connectedAccount.updateMany({
    where: { email: sbUser.email, userId: null },
    data:  { userId: user.id },
  }).catch(() => null);

  // Crear cuenta placeholder si no existe
  const hasAccount = await db.connectedAccount.findFirst({ where: { userId: user.id } });
  if (!hasAccount) {
    await db.connectedAccount.create({
      data: {
        stripeAccountId:  `local_${user.id}`,
        userId:           user.id,
        email:            user.email,
        businessName:     user.name,
        country:          "ES",
        defaultCurrency:  "eur",
        status:           "NOT_CONNECTED",
        chargesEnabled:   false,
        payoutsEnabled:   false,
        detailsSubmitted: false,
      },
    });
  }

  const result: SessionData = {
    user: {
      id:            user.id,
      email:         user.email,
      name:          user.name,
      role:          user.role,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
    },
    sessionId: sbUser.id,
  };

  // 4. Guardar en caché para las llamadas paralelas de la misma carga de página
  setCached(sbUser.id, result);

  return result;
}

// ─── withAuth ─────────────────────────────────────────────────────────────────

/**
 * Envuelve un handler de API con comprobación de autenticación.
 * Devuelve 401 automáticamente si no hay sesión válida.
 */
export function withAuth(
  handler: (req: NextRequest, session: SessionData) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await requireAuth(req);
      return await handler(req, session);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[withAuth]", err);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  };
}

// ─── Helpers de ConnectedAccount ─────────────────────────────────────────────

/**
 * Devuelve los IDs locales de ConnectedAccount asociados al usuario.
 */
export async function getUserAccountIds(userId: string): Promise<string[]> {
  const accounts = await db.connectedAccount.findMany({
    where:  { userId },
    select: { id: true },
  });
  return accounts.map((a) => a.id);
}

/**
 * Devuelve la primera ConnectedAccount activa del usuario, o null si no tiene ninguna.
 */
export async function getUserPrimaryAccount(userId: string) {
  return db.connectedAccount.findFirst({
    where:   { userId },
    orderBy: { createdAt: "asc" },
  });
}
