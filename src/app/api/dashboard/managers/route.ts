import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserPrimaryAccount } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const account = await getUserPrimaryAccount(session.user.id);
    if (!account) return NextResponse.json({ error: "Sin cuenta" }, { status: 404 });

    const managers = await db.manager.findMany({
      where: { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ managers }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[GET /managers]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const account = await getUserPrimaryAccount(session.user.id);
    if (!account) return NextResponse.json({ error: "Sin cuenta" }, { status: 404 });

    const body = await req.json();
    const { name, email, role, reportFrequency, reportFormat, reportDay } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    const manager = await db.manager.create({
      data: {
        connectedAccountId: account.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role ?? "viewer",
        reportFrequency: reportFrequency ?? "weekly",
        reportFormat: reportFormat ?? "csv",
        reportDay: reportDay ?? 1,
        active: true,
      },
    });

    return NextResponse.json({ manager }, { status: 201 });
  } catch (err) {
    console.error("[POST /managers]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
