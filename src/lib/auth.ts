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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !sbUser) {
    throw new AuthError("Sesión no válida o expirada");
  }

  // Usuarios sin email (e.g. solo teléfono) no pueden operar en PayForce
  if (!sbUser.email) {
    throw new AuthError("La cuenta no tiene email asociado. Usa email o Google para acceder.", 403);
  }

  const emailVerified = !!sbUser.email_confirmed_at;

  // Upsert: la primera vez que el usuario entra se crea su registro local
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

  // Vincular cuentas conectadas huérfanas con el mismo email
  await db.connectedAccount.updateMany({
    where: { email: sbUser.email, userId: null },
    data:  { userId: user.id },
  });

  // Crear cuenta placeholder si no existe. Status NOT_CONNECTED hasta que el merchant
  // complete el onboarding Express y PayForce reciba el acct_xxx real de Stripe.
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

  return {
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
