/**
 * POST /api/subscriptions/invite/[token]/confirm
 * Marca la invitación como usada (llamado por el cliente tras guardar tarjeta).
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  await db.cardInvitation.updateMany({
    where: { token, usedAt: null },
    data:  { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
