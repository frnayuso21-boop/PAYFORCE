import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReport, getWeeklyPeriod } from "@/lib/reports/generate";
import { sendReport } from "@/lib/reports/send";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managers = await db.manager.findMany({
    where: { active: true, reportFrequency: "weekly" },
  });

  const results: { id: string; email: string; ok: boolean; error?: string }[] = [];

  for (const manager of managers) {
    try {
      const period = getWeeklyPeriod(1);
      const report = await generateReport(manager.connectedAccountId, period);
      await sendReport(manager, report);
      await db.manager.update({
        where: { id: manager.id },
        data: { lastReportSentAt: new Date() },
      });
      results.push({ id: manager.id, email: manager.email, ok: true });
    } catch (err) {
      console.error(`[cron/reports] Error para manager ${manager.id}:`, err);
      results.push({ id: manager.id, email: manager.email, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
