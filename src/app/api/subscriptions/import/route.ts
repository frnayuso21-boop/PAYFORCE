/**
 * POST /api/subscriptions/import
 *
 * Acepta un archivo multipart (.xlsx, .csv o .xml) y devuelve
 * la lista de registros parseados + cruce con la BD del merchant.
 * Comparte el mismo formato de respuesta que /api/subscriptions/xml/parse
 * para que el cliente pueda reutilizar el flujo de importación existente.
 */
import { NextRequest, NextResponse } from "next/server";
import { XMLParser }                  from "fast-xml-parser";
import { db }                         from "@/lib/db";
import { requireAuth, AuthError }     from "@/lib/auth";
import { parseExcelBuffer, generateTemplate } from "@/lib/parsers/excel";

export const dynamic = "force-dynamic";

// ─── Template download ────────────────────────────────────────────────────────
export async function GET() {
  const buf = generateTemplate();
  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-clientes.xlsx"',
    },
  });
}

// ─── Tipos compartidos ────────────────────────────────────────────────────────
interface RawRecord {
  name:      string;
  reference: string;
  amount:    number;
  iban?:     string | null;
  email?:    string | null;
  phone?:    string | null;
}

// ─── Parser XML (inline para no duplicar el módulo) ──────────────────────────
function extractText(obj: unknown, ...keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const found = Object.keys(o).find((col) =>
      col.toLowerCase() === k.toLowerCase() ||
      col.toLowerCase().replace(/^ns\d+:/, "") === k.toLowerCase()
    );
    if (found !== undefined) {
      const v = o[found];
      if (typeof v === "string" || typeof v === "number") return String(v).trim();
      if (v && typeof v === "object") {
        const inner = (v as Record<string, unknown>)["#text"] ?? (v as Record<string, unknown>)["_"];
        if (inner !== undefined) return String(inner).trim();
        const deeper = extractText(v, ...keys);
        if (deeper) return deeper;
      }
    }
  }
  return "";
}

function findTransactions(obj: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || !obj || typeof obj !== "object") return [];
  const o = obj as Record<string, unknown>;
  const TX_TAGS = ["drctdbttxinf","transaction","transaccion","item","record","entry","pmtinf","creditransftxinf","cdttrf"];
  for (const k of Object.keys(o)) {
    const kl = k.toLowerCase().replace(/^ns\d+:/, "");
    if (TX_TAGS.some((t) => kl.includes(t))) {
      const v = o[k];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
      if (v && typeof v === "object") {
        const inner = findTransactions(v, depth + 1);
        return inner.length > 0 ? inner : [v as Record<string, unknown>];
      }
    }
  }
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === "object") {
      const found = findTransactions(v, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function parseXml(xml: string): RawRecord[] {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true });
  const doc    = parser.parse(xml);
  const txns   = findTransactions(doc);
  if (!txns.length) return [];

  return txns
    .map((tx) => ({
      name:      extractText(tx, "Nm","Name","Nombre"),
      reference: extractText(tx, "MndtId","EndToEndId","Ref","Reference","Id","ExternalRef"),
      amount:    Math.round(parseFloat((extractText(tx, "InstdAmt","Amt","Amount","Importe") || "0").replace(",", ".")) * 100),
      iban:      extractText(tx, "IBAN") || null,
      email:     extractText(tx, "EmailAdr","Email","Mail") || null,
      phone:     null,
    }))
    .filter((r) => r.reference && r.amount > 0);
}

// ─── POST — Parse archivo ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const account = await db.connectedAccount.findFirst({
      where:  { userId: dbUser.id },
      select: { id: true },
    });
    if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });

    const fileName = file.name.toLowerCase();
    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);

    let raw: RawRecord[] = [];

    if (fileName.endsWith(".xml")) {
      const text = buffer.toString("utf-8");
      raw = parseXml(text);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".csv") || fileName.endsWith(".xls")) {
      const rows = parseExcelBuffer(buffer);
      raw = rows.map((r) => ({
        name:      r.name,
        reference: r.reference,
        amount:    r.amount,
        iban:      r.iban,
        email:     r.email,
        phone:     r.phone,
      }));
    } else {
      return NextResponse.json({ error: "Formato no soportado. Usa .xlsx, .csv o .xml" }, { status: 400 });
    }

    if (!raw.length) {
      return NextResponse.json({ error: "El archivo no contiene registros válidos" }, { status: 422 });
    }

    // ── Cruzar con BD ─────────────────────────────────────────────────────────
    const refs = [...new Set(raw.map((r) => r.reference))];
    const existing = await db.subscriptionCustomer.findMany({
      where:  { connectedAccountId: account.id, externalReference: { in: refs } },
      select: { externalReference: true, stripePaymentMethodId: true, status: true, id: true },
    });
    const existMap = new Map(existing.map((e) => [e.externalReference, e]));

    const fmtEur = (c: number) =>
      new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(c / 100);

    const records = raw.map((r) => {
      const hit = existMap.get(r.reference);
      return {
        name:            r.name,
        email:           r.email ?? null,
        phone:           r.phone ?? null,
        reference:       r.reference,
        amount:          r.amount,
        amountFormatted: fmtEur(r.amount),
        iban:            r.iban ?? null,
        found:           !!hit,
        hasCard:         !!(hit?.stripePaymentMethodId),
        customerId:      hit?.id ?? null,
        status:          hit?.status ?? null,
      };
    });

    const totalAmount = raw.reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      totalRecords:         records.length,
      totalAmount,
      totalAmountFormatted: fmtEur(totalAmount),
      withCard:    records.filter((r) => r.hasCard).length,
      withoutCard: records.filter((r) => r.found && !r.hasCard).length,
      notFound:    records.filter((r) => !r.found).length,
      records,
      sourceFile:  file.name,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[subscriptions/import POST]", err);
    return NextResponse.json({ error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}
