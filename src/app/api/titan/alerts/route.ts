import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";
import { checkRateLimit }            from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/titan/alerts
 *
 * Devuelve las alertas de fraude más recientes del merchant autenticado.
 * Parámetros:
 *   ?limit=20&page=1&severity=HIGH,CRITICAL&status=FLAGGED,BLOCKED
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const rl = checkRateLimit(`titan-alerts:${userId}`, { windowMs: 10_000, max: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
    }

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false } });
    }

    const { searchParams } = req.nextUrl;
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit    = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const severity = searchParams.get("severity")?.split(",").filter(Boolean);
    const status   = searchParams.get("status")?.split(",").filter(Boolean);

    const where = {
      connectedAccountId: account.id,
      ...(severity?.length ? { severity: { in: severity } } : {}),
      ...(status?.length   ? { status:   { in: status   } } : {}),
    };

    const [alerts, total] = await Promise.all([
      db.fraudAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          payment: {
            select: {
              id:                    true,
              amount:                true,
              currency:              true,
              status:                true,
              description:           true,
              stripePaymentIntentId: true,
              customerEmail:         true,
              customerName:          true,
              createdAt:             true,
            },
          },
        },
      }),
      db.fraudAlert.count({ where }),
    ]);

    const data = alerts.map((a) => ({
      id:        a.id,
      riskScore: a.riskScore,
      severity:  a.severity,
      status:    a.status,
      flags:     (() => { try { return JSON.parse(a.flags); } catch { return []; } })(),
      createdAt: a.createdAt,
      payment:   a.payment,
    }));

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore:    page * limit < total,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[titan/alerts GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/titan/alerts
 *
 * Actualiza el estado de una alerta (marcar como revisada, descartada…)
 * Body: { alertId, status: "REVIEWED" | "DISMISSED" | "BLOCKED", notes? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const body = await req.json() as { alertId?: string; status?: string; notes?: string };
    if (!body.alertId || !body.status) {
      return NextResponse.json({ error: "alertId y status son obligatorios" }, { status: 400 });
    }

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: "No tienes una cuenta conectada" }, { status: 404 });
    }

    const alert = await db.fraudAlert.findFirst({
      where: { id: body.alertId, connectedAccountId: account.id },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    const updated = await db.fraudAlert.update({
      where: { id: body.alertId },
      data:  {
        status:     body.status,
        notes:      body.notes ?? alert.notes,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[titan/alerts PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
