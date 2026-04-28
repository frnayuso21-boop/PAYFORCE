import type { NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getIp } from "@/lib/audit";
import type { SessionData } from "@/lib/auth";

const TABLE = "auth_security_audit";

export async function insertAuthSecurityAudit(opts: {
  supabaseUserId: string | null;
  action:         string;
  resource?:      string | null;
  ipAddress?:     string | null;
  userAgent?:     string | null;
  metadata?:      Record<string, unknown> | null;
}): Promise<void> {
  const admin = createSupabaseServiceClient();
  if (!admin) return;
  const { error } = await admin.from(TABLE).insert({
    user_id:    opts.supabaseUserId,
    action:     opts.action,
    resource:   opts.resource ?? null,
    ip_address: opts.ipAddress ?? null,
    user_agent: opts.userAgent ?? null,
    metadata:   opts.metadata ?? null,
  });
  if (error) console.error("[auth_security_audit]", error.message);
}

export async function logAuthSecurityAudit(
  req: NextRequest,
  session: SessionData,
  opts: {
    action:     string;
    resource?:  string;
    metadata?:  Record<string, unknown>;
  },
): Promise<void> {
  await insertAuthSecurityAudit({
    supabaseUserId: session.sessionId,
    action:         opts.action,
    resource:       opts.resource ?? null,
    ipAddress:      getIp(req),
    userAgent:      req.headers.get("user-agent"),
    metadata:       opts.metadata ?? null,
  });
}
