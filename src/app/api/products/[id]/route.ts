import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getOwnedProduct(id: string, accountIds: string[]) {
  return db.product.findFirst({
    where: { id, connectedAccountId: { in: accountIds } },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;
    const product = await getOwnedProduct(id, ids);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;
    const existing = await getOwnedProduct(id, ids);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const allowed = ["name","description","imageUrl","sku","category","price","currency","unit","taxRate","stock","active"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) {
        if (k === "price" || k === "stock") data[k] = body[k] != null ? Number(body[k]) : null;
        else if (k === "taxRate") data[k] = Number(body[k]);
        else data[k] = body[k];
      }
    }

    const product = await db.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;
    const existing = await getOwnedProduct(id, ids);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
