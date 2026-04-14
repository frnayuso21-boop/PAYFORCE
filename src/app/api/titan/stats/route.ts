import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";
import { checkRateLimit }            from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/titan/stats
 *
 * Devuelve métricas de fraude agregadas para el merchant autenticado:
 *   - totalReviewed   — pagos con riskScore calculado
 *   - blocked         — pagos bloqueados automáticamente
 *   - highRisk        — alertas HIGH + CRITICAL
 *   - avgScore        — media del riskScore (últimos 30 días)
 *   - alertsByDay     — serie temporal de alertas (30 días)
 *   - topFlags        — señales más frecuentes
 *   - severityBreakdown — distribución por severidad
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const rl = checkRateLimit(`titan-stats:${userId}`, { windowMs: 10_000, max: 30 });
    if (!rl.success) {
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
    }

    const account = await db.connectedAccount.findFirst({
      where:  { userId },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ totalReviewed: 0, blocked: 0, highRisk: 0, avgScore: 0, alertsByDay: [], topFlags: [], severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } });
    }

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── Consultas en paralelo ──────────────────────────────────────────────
    const [
      totalReviewed,
      blocked,
      highRiskCount,
      avgScoreResult,
      alerts30d,
    ] = await Promise.all([
      // Pagos con score calculado
      db.payment.count({
        where: { connectedAccountId: account.id, riskScore: { not: null } },
      }),
      // Pagos bloqueados
      db.payment.count({
        where: { connectedAccountId: account.id, riskBlocked: true },
      }),
      // Alertas HIGH o CRITICAL en 30 días
      db.fraudAlert.count({
        where: {
          connectedAccountId: account.id,
          severity:           { in: ["HIGH", "CRITICAL"] },
          createdAt:          { gte: since30d },
        },
      }),
      // Media de score últimos 30 días
      db.payment.aggregate({
        where: {
          connectedAccountId: account.id,
          riskScore:          { not: null },
          createdAt:          { gte: since30d },
        },
        _avg: { riskScore: true },
      }),
      // Todas las alertas de los últimos 30 días
      db.fraudAlert.findMany({
        where:   { connectedAccountId: account.id, createdAt: { gte: since30d } },
        orderBy: { createdAt: "asc" },
        select:  { createdAt: true, severity: true, flags: true },
      }),
    ]);

    // ── Serie temporal: alertas por día ───────────────────────────────────
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86_400_000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const a of alerts30d) {
      const day = a.createdAt.toISOString().slice(0, 10);
      if (day in dayMap) dayMap[day]++;
    }
    const alertsByDay = Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // ── Top señales (flags más frecuentes) ────────────────────────────────
    const flagCounts: Record<string, { code: string; label: string; count: number }> = {};
    for (const a of alerts30d) {
      try {
        const flags = JSON.parse(a.flags) as { code: string; label: string }[];
        for (const f of flags) {
          if (!flagCounts[f.code]) flagCounts[f.code] = { code: f.code, label: f.label, count: 0 };
          flagCounts[f.code].count++;
        }
      } catch { /* skip malformed */ }
    }
    const topFlags = Object.values(flagCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Distribución por severidad ────────────────────────────────────────
    const severityBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const a of alerts30d) {
      const k = a.severity as keyof typeof severityBreakdown;
      if (k in severityBreakdown) severityBreakdown[k]++;
    }

    return NextResponse.json({
      totalReviewed,
      blocked,
      highRisk:  highRiskCount,
      avgScore:  Math.round(avgScoreResult._avg.riskScore ?? 0),
      alertsByDay,
      topFlags,
      severityBreakdown,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[titan/stats GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
