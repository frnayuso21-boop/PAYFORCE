/**
 * POST /api/subscriptions/xml/import
 *
 * Importa clientes nuevos del XML en paralelo.
 * - Stripe customer.create en chunks de CONCURRENCY simultáneos
 * - DB insert con createMany (una sola query al final)
 *
 * 100 clientes nuevos: ~4-6 s en lugar de ~25 s en serie.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";

export const dynamic  = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 10; // Stripe recomienda ≤ 25 creates/s en test, 10 es seguro

interface ParseRecord {
  name:      string;
  email?:    string | null;
  reference: string;
  amount:    number;
  iban?:     string | null;
  found:     boolean;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, businessName: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  let body: { records: ParseRecord[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const all     = body.records ?? [];
  const skipped = all.filter(r => r.found || !r.name || !r.reference).length;
  const toCreate = all.filter(r => !r.found && r.name?.trim() && r.reference?.trim());

  if (!toCreate.length) {
    return NextResponse.json({ imported: 0, skipped, errors: 0 });
  }

  // ── Crear en Stripe en chunks paralelos ──────────────────────────────────────
  type DbRow = Parameters<typeof db.subscriptionCustomer.createMany>[0]["data"][number];
  const dbRows:  DbRow[]  = [];
  let   errors            = 0;

  for (const batch of chunk(toCreate, CONCURRENCY)) {
    const results = await Promise.allSettled(
      batch.map(async rec => {
        const email = rec.email?.trim()
          || `noreply+${rec.reference.replace(/\W/g, "")}@payforce.internal`;

        const sc = await stripe.customers.create({
          name:  rec.name.trim(),
          email,
          metadata: {
            connectedAccountId: account.id,
            externalReference:  rec.reference,
          },
        });

        return { sc, rec, email };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { sc, rec, email } = r.value;
        dbRows.push({
          connectedAccountId: account.id,
          stripeCustomerId:   sc.id,
          name:               rec.name.trim(),
          email,
          externalReference:  rec.reference.trim(),
          amount:             rec.amount || null,
          iban:               rec.iban?.trim() ?? null,
          status:             "PENDING_CARD",
        });
      } else {
        errors++;
      }
    }
  }

  // ── Insertar todos en BD en una sola query ────────────────────────────────────
  if (dbRows.length) {
    await db.subscriptionCustomer.createMany({
      data:            dbRows,
      skipDuplicates:  true, // si por algún motivo ya existe el stripeCustomerId
    });
  }

  return NextResponse.json({
    imported: dbRows.length,
    skipped,
    errors,
  });
}
