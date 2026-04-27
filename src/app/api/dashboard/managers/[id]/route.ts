import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserPrimaryAccount } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedManager(userId: string, managerId: string) {
  const account = await getUserPrimaryAccount(userId);
  if (!account) return null;

  return db.manager.findFirst({
    where: { id: managerId, connectedAccountId: account.id },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const existing = await getOwnedManager(session.user.id, id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();
    const { name, email, role, reportFrequency, reportFormat, reportDay, active } = body;

    const manager = await db.manager.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(role !== undefined && { role }),
        ...(reportFrequency !== undefined && { reportFrequency }),
        ...(reportFormat !== undefined && { reportFormat }),
        ...(reportDay !== undefined && { reportDay }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ manager });
  } catch (err) {
    console.error("[PATCH /managers/:id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const existing = await getOwnedManager(session.user.id, id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await db.manager.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /managers/:id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
