// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError, getUserPrimaryAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── DELETE /api/api-keys/[id] — revocar key ──────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth(req);
    const { id }   = await params;

    const account = await getUserPrimaryAccount(user.id);
    if (!account) {
      return NextResponse.json({ error: "No tienes una cuenta activa." }, { status: 422 });
    }

    const key = await db.apiKey.findFirst({
      where: { id, connectedAccountId: account.id },
    });
    if (!key) {
      return NextResponse.json({ error: "API Key no encontrada." }, { status: 404 });
    }

    await db.apiKey.update({
      where: { id },
      data:  { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
