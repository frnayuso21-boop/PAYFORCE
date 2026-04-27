/**
 * GET /api/billing/batch/[batchId]/report
 * Devuelve el reporte del batch.
 * ?format=csv  → descarga CSV compatible con Excel español (sep=;, decimal ,)
 * Sin parámetro → JSON
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtEur(cents: number) {
  // Excel español espera coma decimal
  return (cents / 100).toFixed(2).replace(".", ",");
}

function escCsv(v: string | null | undefined) {
  const s = v ?? "";
  return s.includes(";") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const wantCsv = req.nextUrl.searchParams.get("format") === "csv";

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  const batch = await db.batchJob.findFirst({
    where:   { id: batchId, connectedAccountId: account.id },
    include: {
      results: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  if (!wantCsv) {
    return NextResponse.json({
      batchJobId:   batch.id,
      filename:     batch.filename,
      status:       batch.status,
      createdAt:    batch.createdAt,
      processedAt:  batch.processedAt,
      totalCount:   batch.totalCount,
      successCount: batch.successCount,
      failedCount:  batch.failedCount,
      noCardCount:  batch.noCardCount,
      results:      batch.results.map(r => ({
        externalRef:     r.externalRef,
        endToEndId:      r.endToEndId,
        customerName:    r.customerName,
        amount:          r.amount,
        currency:        r.currency,
        status:          r.status,
        failureReason:   r.failureReason,
        paymentIntentId: r.paymentIntentId,
        createdAt:       r.createdAt,
      })),
    });
  }

  // ── CSV ──────────────────────────────────────────────────────────────────────
  const BOM  = "\uFEFF"; // BOM UTF-8 para Excel
  const CRLF = "\r\n";

  const header = [
    "Referencia", "EndToEndId", "Nombre cliente",
    "Importe (EUR)", "Estado", "Motivo fallo",
    "PaymentIntent ID", "Fecha",
  ].map(escCsv).join(";");

  const rows = batch.results.map(r =>
    [
      escCsv(r.externalRef),
      escCsv(r.endToEndId),
      escCsv(r.customerName),
      fmtEur(r.amount),
      escCsv(r.status),
      escCsv(r.failureReason),
      escCsv(r.paymentIntentId),
      r.createdAt.toISOString().slice(0, 19).replace("T", " "),
    ].join(";"),
  );

  const csv = BOM + [header, ...rows].join(CRLF);
  const filename = `batch_${batch.id.slice(0, 8)}_${batch.filename.replace(/\.xml$/i, "")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
