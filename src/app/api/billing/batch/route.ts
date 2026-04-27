/**
 * POST /api/billing/batch
 * Sube un XML SEPA pain.008, lo parsea y crea un BatchJob.
 * NO ejecuta los cobros — devuelve un resumen para que el merchant confirme.
 */
import { NextRequest, NextResponse } from "next/server";
import { XMLParser }                  from "fast-xml-parser";
import { db }                         from "@/lib/db";
import { createSupabaseServer }       from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ── Tipos internos ────────────────────────────────────────────────────────────
interface ParsedTransaction {
  externalRef:  string;   // MndtId
  endToEndId:   string;   // EndToEndId
  customerName: string;   // Nm
  amount:       number;   // céntimos
  iban?:        string;   // IBAN del deudor
}

function parseSepaXml(xml: string): ParsedTransaction[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue:    true,
    trimValues:       true,
  });
  const doc = parser.parse(xml);

  // Navegar la estructura pain.008 (puede variar por namespace)
  const root      = doc?.Document?.CstmrDrctDbtInitn ?? doc?.Document?.["ns2:CstmrDrctDbtInitn"] ?? {};
  const pmtInf    = root?.PmtInf ?? root?.["ns2:PmtInf"];
  const pmtInfArr = Array.isArray(pmtInf) ? pmtInf : pmtInf ? [pmtInf] : [];

  const results: ParsedTransaction[] = [];

  for (const block of pmtInfArr) {
    const txns = block?.DrctDbtTxInf ?? block?.["ns2:DrctDbtTxInf"];
    const txArr = Array.isArray(txns) ? txns : txns ? [txns] : [];

    for (const tx of txArr) {
      const mndtId    = String(tx?.DrctDbtTx?.MndtRltdInf?.MndtId ?? tx?.["ns2:DrctDbtTx"]?.["ns2:MndtRltdInf"]?.["ns2:MndtId"] ?? "");
      const e2eId     = String(tx?.PmtId?.EndToEndId ?? tx?.["ns2:PmtId"]?.["ns2:EndToEndId"] ?? "");
      const name      = String(tx?.Dbtr?.Nm ?? tx?.["ns2:Dbtr"]?.["ns2:Nm"] ?? "");
      const amtRaw    = tx?.InstdAmt?.["#text"] ?? tx?.["ns2:InstdAmt"]?.["#text"] ?? tx?.InstdAmt ?? tx?.["ns2:InstdAmt"] ?? "0";
      const iban      = String(tx?.DbtrAcct?.Id?.IBAN ?? tx?.["ns2:DbtrAcct"]?.["ns2:Id"]?.["ns2:IBAN"] ?? "");

      const euros   = parseFloat(String(amtRaw).replace(",", "."));
      const amount  = isNaN(euros) ? 0 : Math.round(euros * 100);

      if (!mndtId || amount <= 0) continue;

      results.push({ externalRef: mndtId, endToEndId: e2eId, customerName: name, amount, iban: iban || undefined });
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, stripeAccountId: true, chargesEnabled: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  // Leer FormData
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded (field: file)" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xml")) {
    return NextResponse.json({ error: "Only XML files are accepted" }, { status: 400 });
  }

  const xml  = await file.text();
  let txns: ParsedTransaction[];
  try {
    txns = parseSepaXml(xml);
  } catch {
    return NextResponse.json({ error: "Failed to parse XML. Verify it is a valid pain.008 file." }, { status: 422 });
  }
  if (txns.length === 0) {
    return NextResponse.json({ error: "No valid transactions found in XML." }, { status: 422 });
  }

  // Buscar clientes con tarjeta por externalReference
  const refs = [...new Set(txns.map(t => t.externalRef))];
  const knownCustomers = await db.subscriptionCustomer.findMany({
    where: {
      connectedAccountId: account.id,
      externalReference:  { in: refs },
    },
    select: { id: true, externalReference: true, stripeCustomerId: true, stripePaymentMethodId: true, name: true, email: true, status: true },
  });

  const customerMap = new Map(knownCustomers.map(c => [c.externalReference!, c]));

  // Crear BatchJob con sus resultados
  const batchJob = await db.batchJob.create({
    data: {
      connectedAccountId: account.id,
      filename:           file.name,
      totalCount:         txns.length,
      status:             "PENDING",
      results: {
        create: txns.map(t => {
          const c = customerMap.get(t.externalRef);
          const hasCard = !!(c?.stripePaymentMethodId && c.status === "ACTIVE");
          return {
            externalRef:  t.externalRef,
            endToEndId:   t.endToEndId || null,
            customerName: t.customerName,
            amount:       t.amount,
            currency:     "eur",
            customerId:   c?.id ?? null,
            status:       hasCard ? "PENDING" : "NO_CARD",
          };
        }),
      },
    },
    include: { results: true },
  });

  // Resumen
  const ready   = batchJob.results.filter(r => r.status === "PENDING");
  const noCard  = batchJob.results.filter(r => r.status === "NO_CARD");

  // Actualizar contadores
  await db.batchJob.update({
    where: { id: batchJob.id },
    data:  { noCardCount: noCard.length },
  });

  return NextResponse.json({
    batchJobId:     batchJob.id,
    total:          txns.length,
    readyToCharge:  ready.length,
    noCard:         noCard.length,
    noCardList:     noCard.map(r => ({ name: r.customerName, externalRef: r.externalRef })),
    warning:        account.chargesEnabled ? null : "⚠️ La cuenta no tiene cobros habilitados en Stripe",
  }, { status: 201 });
}
