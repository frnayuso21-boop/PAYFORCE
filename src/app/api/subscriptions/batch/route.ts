/**
 * POST /api/subscriptions/batch/execute
 *
 * Cobros masivos off-session en paralelo.
 * - Stripe calls en chunks de CONCURRENCY (default 15) simultáneos
 * - DB results con createMany (una sola query al final)
 * - Customer updates en paralelo con Promise.all
 *
 * 100 cobros: ~3-5 s en lugar de ~40 s en serie.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma }                    from "@prisma/client";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel: hasta 60 s para planes Pro

const CONCURRENCY = 15; // llamadas Stripe simultáneas (límite de rate: 100/s)

interface ParseRecord {
  name:       string;
  reference:  string;
  amount:     number;
  hasCard:    boolean;
  customerId: string | null;
}

function fmtEur(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Divide un array en trozos de tamaño n */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, stripeAccountId: true, chargesEnabled: true },
  });
  if (!account)                return NextResponse.json({ error: "No connected account" }, { status: 404 });
  if (!account.chargesEnabled) return NextResponse.json({ error: "Stripe charges not enabled" }, { status: 403 });

  let body: { records: ParseRecord[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const toCharge = (body.records ?? []).filter(r => r.hasCard && r.customerId);
  if (!toCharge.length) return NextResponse.json({ error: "No records with card to charge" }, { status: 400 });

  // ── Carga en BD de customers en una sola query ───────────────────────────────
  const customerIds = toCharge.map(r => r.customerId!);
  const customers   = await db.subscriptionCustomer.findMany({
    where:  { id: { in: customerIds }, connectedAccountId: account.id },
    select: { id: true, stripeCustomerId: true, stripePaymentMethodId: true, externalReference: true, name: true },
  });
  const cMap = new Map(customers.map(c => [c.id, c]));

  // ── BatchJob ──────────────────────────────────────────────────────────────────
  const batchMonth = new Date().toISOString().slice(0, 7);
  const batchJob   = await db.batchJob.create({
    data: {
      connectedAccountId: account.id,
      filename:           `batch_${batchMonth}.xml`,
      totalCount:         toCharge.length,
      status:             "PROCESSING",
    },
  });

  const description = `Recibo ${new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`;

  // ── Resultados acumulados ────────────────────────────────────────────────────
  type ResultRow = Prisma.BatchResultCreateManyInput;
  type UpdateRow = { id: string; amount: number };

  const dbResults:   ResultRow[]   = [];
  const successUpdates: UpdateRow[] = [];
  const failedList: { name: string; reference: string; amount: number; reason: string }[] = [];

  let successCount = 0;
  let failedCount  = 0;
  let totalCharged = 0;

  // ── Procesamiento en chunks paralelos ────────────────────────────────────────
  const chunks = chunk(toCharge, CONCURRENCY);

  for (const batch of chunks) {
    const results = await Promise.allSettled(
      batch.map(async rec => {
        const customer = cMap.get(rec.customerId!);

        if (!customer?.stripePaymentMethodId) {
          return { ok: false, rec, reason: "No payment method on file" };
        }

        const { calculateFee } = await import("@/lib/fees");
        const fee = calculateFee(rec.amount, "card");

        const pi = await stripe.paymentIntents.create({
          amount:                 rec.amount,
          currency:               "eur",
          customer:               customer.stripeCustomerId,
          payment_method:         customer.stripePaymentMethodId,
          confirm:                true,
          off_session:            true,
          application_fee_amount: fee,
          transfer_data:          { destination: account.stripeAccountId },
          description:            `${description} - ${customer.externalReference ?? rec.reference}`,
          metadata: {
            connectedAccountId: account.id,
            externalReference:  customer.externalReference ?? rec.reference,
            batchJobId:         batchJob.id,
            batchMonth,
          },
        });

        return { ok: true, rec, pi, customer };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const val = result.value;

        if (!val.ok) {
          // Sin método de pago
          dbResults.push({
            batchJobId:    batchJob.id,
            customerId:    val.rec.customerId,
            externalRef:   val.rec.reference,
            customerName:  val.rec.name,
            amount:        val.rec.amount,
            status:        "NO_CARD",
            failureReason: val.reason,
          });
          failedList.push({ name: val.rec.name, reference: val.rec.reference, amount: val.rec.amount, reason: val.reason! });
          failedCount++;

        } else {
          // Éxito
          dbResults.push({
            batchJobId:      batchJob.id,
            customerId:      val.rec.customerId,
            externalRef:     val.rec.reference,
            customerName:    val.rec.name,
            amount:          val.rec.amount,
            status:          "SUCCESS",
            paymentIntentId: val.pi!.id,
          });
          successUpdates.push({ id: val.rec.customerId!, amount: val.rec.amount });
          successCount++;
          totalCharged += val.rec.amount;
        }

      } else {
        // Error de Stripe
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        const rec    = batch[results.indexOf(result)]; // aprox — usamos índice
        dbResults.push({
          batchJobId:    batchJob.id,
          customerId:    rec?.customerId ?? null,
          externalRef:   rec?.reference  ?? "unknown",
          customerName:  rec?.name       ?? "unknown",
          amount:        rec?.amount     ?? 0,
          status:        "FAILED",
          failureReason: reason,
        });
        failedList.push({ name: rec?.name ?? "unknown", reference: rec?.reference ?? "", amount: rec?.amount ?? 0, reason });
        failedCount++;
      }
    }
  }

  // ── Escritura en BD en paralelo ───────────────────────────────────────────────
  const now = new Date();

  const validResults = dbResults.filter(
    (r): r is typeof r & { batchJobId: string } => typeof r.batchJobId === "string"
  );

  await Promise.all([
    // Todos los resultados en una sola query
    db.batchResult.createMany({ data: validResults }),

    // Actualizar BatchJob
    db.batchJob.update({
      where: { id: batchJob.id },
      data:  { status: "COMPLETED", processedAt: now, successCount, failedCount },
    }),

    // Actualizar lastChargeAt/lastChargeAmount en paralelo (una query por cliente)
    ...successUpdates.map(u =>
      db.subscriptionCustomer.update({
        where: { id: u.id },
        data:  { lastChargeAt: now, lastChargeAmount: u.amount },
      })
    ),
  ]);

  return NextResponse.json({
    batchJobId:            batchJob.id,
    total:                 toCharge.length,
    success:               successCount,
    failed:                failedCount,
    totalCharged,
    totalChargedFormatted: fmtEur(totalCharged),
    failedList,
  });
}
