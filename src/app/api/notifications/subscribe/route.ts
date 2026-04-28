import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/notifications/subscribe — guardar o actualizar suscripción push
export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>["user"];
  try {
    ({ user } = await requireAuth(req));
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { endpoint: string; keys: { p256dh: string; auth: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Datos de suscripción incompletos" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where:  { endpoint: body.endpoint },
    create: {
      userId:   user.id,
      endpoint: body.endpoint,
      p256dh:   body.keys.p256dh,
      auth:     body.keys.auth,
    },
    update: {
      userId: user.id,
      p256dh: body.keys.p256dh,
      auth:   body.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications/subscribe — eliminar suscripción push
export async function DELETE(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>["user"];
  try {
    ({ user } = await requireAuth(req));
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { endpoint: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
