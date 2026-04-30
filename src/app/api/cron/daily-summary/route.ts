import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { sendPushToAdmin }           from "@/lib/notifications/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── GET /api/cron/daily-summary ─────────────────────────────────────────────
// Llamado por Vercel Cron a las 20:00 cada día.
// Envía resumen de comisiones del día al admin.

export async function GET(req: NextRequest) {
  // Proteger el endpoint con el secreto de cron de Vercel
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now          = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Calcular comisiones del día desde MerchantSplit
  const splits = await db.merchantSplit.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { platformFee: true },
  });

  const totalComisiones    = splits.reduce((sum, s) => sum + (s.platformFee ?? 0), 0);
  const totalTransacciones = splits.length;

  if (totalTransacciones === 0) {
    return NextResponse.json({ ok: true, message: "Sin transacciones hoy — notificación omitida" });
  }

  const comisionesEur = (totalComisiones / 100).toFixed(2);
  const fecha         = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  await sendPushToAdmin({
    title: "Resumen de hoy — PayForce",
    body:  `Has ganado ${comisionesEur}€ en ${totalTransacciones} transacción${totalTransacciones > 1 ? "es" : ""} · ${fecha}`,
    url:   "/admin",
    tag:   `daily-summary-${now.toISOString().slice(0, 10)}`,
  });

  return NextResponse.json({
    ok:                  true,
    date:                now.toISOString().slice(0, 10),
    totalComisiones,
    totalTransacciones,
  });
}
