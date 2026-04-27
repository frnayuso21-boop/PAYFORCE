import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserPrimaryAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateReport, getWeeklyPeriod } from "@/lib/reports/generate";
import { sendReport } from "@/lib/reports/send";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(req);
    const account = await getUserPrimaryAccount(session.user.id);
    if (!account) return NextResponse.json({ error: "Sin cuenta" }, { status: 404 });

    const { id } = await params;
    const manager = await db.manager.findFirst({
      where: { id, connectedAccountId: account.id },
    });
    if (!manager) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

    const period = getWeeklyPeriod(1);
    const report = await generateReport(account.id, period);
    await sendReport(manager, report);

    await db.manager.update({
      where: { id },
      data: { lastReportSentAt: new Date() },
    });

    return NextResponse.json({ ok: true, summary: report.summary });
  } catch (err) {
    console.error("[POST /managers/:id/report]", err);
    return NextResponse.json({ error: "Error al enviar informe", detail: String(err) }, { status: 500 });
  }
}
