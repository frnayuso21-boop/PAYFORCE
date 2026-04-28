/**
 * src/lib/audit.ts
 * Helper para registrar eventos de auditoría de seguridad.
 * Llamar desde API routes server-side, nunca desde cliente.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_FAILED"
  | "2FA_SUCCESS"
  | "PASSWORD_CHANGED"
  | "PAYMENT_REFUNDED"
  | "SETTINGS_CHANGED"
  | "PAYMENT_LINK_CREATED";

interface AuditOptions {
  userId:     string;
  action:     AuditAction;
  resource:   string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?:  Record<string, unknown>;
}

/**
 * Crea un registro de auditoría. No lanza excepciones — si falla lo ignora
 * para no bloquear la operación principal.
 */
export async function audit(opts: AuditOptions): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId:     opts.userId,
        action:     opts.action,
        resource:   opts.resource,
        resourceId: opts.resourceId ?? null,
        ipAddress:  opts.ipAddress  ?? null,
        userAgent:  opts.userAgent  ?? null,
        metadata:
          opts.metadata !== undefined
            ? (JSON.parse(JSON.stringify(opts.metadata)) as Prisma.InputJsonValue)
            : undefined,
      },
    });
  } catch {
    // No bloquear la operación principal si el log falla
  }
}

/** Extrae la IP real del request (compatible con Vercel/proxies). */
export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
