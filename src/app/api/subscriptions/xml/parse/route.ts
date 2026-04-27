/**
 * POST /api/subscriptions/xml/parse
 * Parsea un XML SEPA pain.008 (u otro formato XML) y devuelve
 * un resumen con el estado de cada registro en la BD del merchant.
 */
import { NextRequest, NextResponse } from "next/server";
import { XMLParser }                  from "fast-xml-parser";
import { db }                         from "@/lib/db";
import { createSupabaseServerClient }       from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RawRecord {
  name:      string;
  reference: string;
  amount:    number;   // céntimos
  iban?:     string;
  email?:    string;
}

// ── Parser XML flexible ───────────────────────────────────────────────────────
function extractText(obj: unknown, ...keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    // Búsqueda case-insensitive en todas las claves del objeto
    const found = Object.keys(o).find(key => key.toLowerCase() === k.toLowerCase()
      || key.toLowerCase().replace(/^ns\d+:/, "") === k.toLowerCase());
    if (found !== undefined) {
      const v = o[found];
      if (typeof v === "string" || typeof v === "number") return String(v).trim();
      if (v && typeof v === "object") {
        const inner = (v as Record<string, unknown>)["#text"] ?? (v as Record<string, unknown>)["_"];
        if (inner !== undefined) return String(inner).trim();
        // Recursivo un nivel
        const deeper = extractText(v, ...keys);
        if (deeper) return deeper;
      }
    }
  }
  return "";
}

function parseAmountEur(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// Recorre recursivamente buscando arrays de transacciones
function findTransactions(obj: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || !obj || typeof obj !== "object") return [];
  const o = obj as Record<string, unknown>;

  // Etiquetas típicas de pain.008 y formatos similares
  const TX_TAGS = ["drctdbttxinf", "transaction", "transaccion", "item", "record", "entry",
                   "pmtinf", "creditransftxinf", "cdttrf"];

  for (const k of Object.keys(o)) {
    const kl = k.toLowerCase().replace(/^ns\d+:/, "");
    if (TX_TAGS.some(t => kl.includes(t))) {
      const v = o[k];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
      if (v && typeof v === "object") {
        // Puede ser un solo objeto: lo envolvemos
        // O buscar dentro
        const inner = findTransactions(v, depth + 1);
        if (inner.length > 0) return inner;
        return [v as Record<string, unknown>];
      }
    }
  }

  // Buscar en todos los hijos
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === "object") {
      const found = findTransactions(v, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function parseSepa(xml: string): RawRecord[] {
  const parser = new XMLParser({
    ignoreAttributes:    false,
    parseTagValue:       true,
    trimValues:          true,
    parseAttributeValue: true,
  });
  const doc = parser.parse(xml);

  const txns = findTransactions(doc);
  if (!txns.length) return [];

  return txns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((rawTx) => {
      const tx = rawTx as any;

      // Nombre
      const name = extractText(tx, "Nm", "Name", "Nombre", "NombreDeudor") ||
                   extractText(tx?.Dbtr ?? tx?.Creditor ?? tx, "Nm", "Name");

      // Referencia: prioridad MndtId > EndToEndId > Ref > Id
      const ref  = extractText(tx, "MndtId", "EndToEndId", "Ref", "Reference", "Id", "ExternalRef") ||
                   extractText(tx?.DrctDbtTx?.MndtRltdInf ?? tx?.MndtRltdInf ?? tx, "MndtId");

      // Importe
      const amtRaw = extractText(tx, "InstdAmt", "Amt", "TtlInttdAmt", "Amount", "Importe") ||
                     extractText(tx?.InstdAmt ?? tx?.Amt ?? tx, "#text");
      const amount = parseAmountEur(amtRaw);

      // IBAN
      const iban  = extractText(tx, "IBAN") ||
                    extractText(tx?.DbtrAcct?.Id ?? tx?.CdtrAcct?.Id ?? tx, "IBAN");

      // Email (no siempre está en pain.008)
      const email = extractText(tx, "EmailAdr", "Email", "Mail");

      return { name, reference: ref, amount, iban: iban || undefined, email: email || undefined };
    })
    .filter(r => r.reference && r.amount > 0);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
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

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file (field: file)" }, { status: 400 });

  const xml = await file.text();
  let raw: RawRecord[];
  try { raw = parseSepa(xml); }
  catch { return NextResponse.json({ error: "XML parse error" }, { status: 422 }); }

  if (!raw.length) return NextResponse.json({ error: "No valid records found in XML" }, { status: 422 });

  // Cruzar con BD
  const refs = [...new Set(raw.map(r => r.reference))];
  const known = await db.subscriptionCustomer.findMany({
    where: { connectedAccountId: account.id, externalReference: { in: refs } },
    select: { id: true, externalReference: true, stripePaymentMethodId: true, status: true },
  });
  const knownMap = new Map(known.map(c => [c.externalReference!, c]));

  const records = raw.map(r => {
    const c = knownMap.get(r.reference);
    return {
      name:            r.name,
      email:           r.email ?? null,
      reference:       r.reference,
      amount:          r.amount,
      amountFormatted: fmtEur(r.amount),
      iban:            r.iban ?? null,
      found:           !!c,
      hasCard:         !!(c?.stripePaymentMethodId),
      customerId:      c?.id ?? null,
      status:          c?.status ?? null,
    };
  });

  const withCard    = records.filter(r => r.hasCard).length;
  const withoutCard = records.filter(r => r.found && !r.hasCard).length;
  const notFound    = records.filter(r => !r.found).length;
  const totalAmount = raw.reduce((s, r) => s + r.amount, 0);

  return NextResponse.json({
    totalRecords:        records.length,
    totalAmount,
    totalAmountFormatted: fmtEur(totalAmount),
    withCard,
    withoutCard,
    notFound,
    records,
  });
}

function fmtEur(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
