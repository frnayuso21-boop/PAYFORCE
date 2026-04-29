/**
 * GET  /api/subscriptions/customers  — Listar clientes del merchant
 * POST /api/subscriptions/customers  — Crear cliente + SetupIntent
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAccount() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return null;

  return db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, stripeAccountId: true, chargesEnabled: true, businessName: true },
  });
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const account = await getAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const customers = await db.subscriptionCustomer.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, phone: true,
        externalReference: true, iban: true, amount: true, currency: true,
        status: true, stripeCustomerId: true, stripePaymentMethodId: true,
        lastChargeAt: true, lastChargeAmount: true, createdAt: true,
      },
    });

    return NextResponse.json({ data: customers, total: customers.length });
  } catch (err) {
    console.error("[GET /api/subscriptions/customers]", err);
    return NextResponse.json({ error: "Internal server error", data: [] }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name:               string;
    email:              string;
    phone?:             string;
    externalReference?: string;
    amount?:            number;
    iban?:              string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, email, phone, externalReference, amount, iban } = body;
  if (!name?.trim())  return NextResponse.json({ error: "name is required" },  { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "email is required" }, { status: 400 });

  // Crear en Stripe
  const stripeCustomer = await stripe.customers.create({
    name:  name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() ?? undefined,
    metadata: {
      connectedAccountId: account.id,
      externalReference:  externalReference ?? "",
    },
  });

  // SetupIntent para guardar tarjeta sin cobrar
  const setupIntent = await stripe.setupIntents.create({
    customer:                  stripeCustomer.id,
    usage:                     "off_session",
    automatic_payment_methods: { enabled: true },
    metadata: {
      connectedAccountId: account.id,
    },
  });

  // Guardar en BD
  const customer = await db.subscriptionCustomer.create({
    data: {
      connectedAccountId:  account.id,
      stripeCustomerId:    stripeCustomer.id,
      name:                name.trim(),
      email:               email.trim().toLowerCase(),
      phone:               phone?.trim() ?? null,
      externalReference:   externalReference?.trim() ?? null,
      amount:              amount ?? null,
      iban:                iban?.trim() ?? null,
      status:              "PENDING_CARD",
    },
  });

  return NextResponse.json(
    { customerId: customer.id, clientSecret: setupIntent.client_secret, customer },
    { status: 201 },
  );
}
