import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── POST /api/subscriptions ── Crear suscripción ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = await req.json() as {
      customerEmail:       string;
      customerName?:       string;
      productName:         string;
      description?:        string;
      statementDescriptor?: string;  // aparece en el extracto bancario (máx 22 chars)
      priceType:           "fixed" | "variable";
      amount?:             number;   // céntimos — para precio fijo
      interval:            "month" | "week" | "year";
      trialDays?:          number;
    };

    const { customerEmail, customerName, productName, description,
            statementDescriptor, priceType, amount, interval, trialDays } = body;

    if (!customerEmail) return NextResponse.json({ error: "Email del cliente requerido" }, { status: 400 });
    if (!productName)   return NextResponse.json({ error: "Nombre del producto requerido" }, { status: 400 });
    if (priceType === "fixed" && (!amount || amount < 50))
      return NextResponse.json({ error: "Importe mínimo 0,50 € para precio fijo" }, { status: 400 });

    // 1. Crear o recuperar cliente Stripe
    const existingList = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customer = existingList.data[0];
    if (!customer) {
      customer = await stripe.customers.create({
        email: customerEmail,
        name:  customerName,
        metadata: { merchantUserId: user.id },
      });
    }

    // Validar statement descriptor (máx 22 chars, sin caracteres especiales)
    const cleanDescriptor = statementDescriptor
      ? statementDescriptor.replace(/[<>"'\\]/g, "").slice(0, 22).toUpperCase()
      : undefined;

    // 2. Crear producto Stripe
    const product = await stripe.products.create({
      name:               productName,
      description:        description ?? undefined,
      statement_descriptor: cleanDescriptor,
      metadata:           { merchantUserId: user.id },
    });

    // 3. Crear precio base
    // Para precio variable usamos un precio de 0€/mes como "ancla" de la suscripción.
    // Los cargos reales se añaden manualmente como Invoice Items antes de cada factura.
    // Esto permite cobrar importes completamente libres cada período (ej: energía).
    const priceAmount = priceType === "fixed" ? amount! : 0;
    const price = await stripe.prices.create({
      product:    product.id,
      unit_amount: priceAmount,
      currency:   "eur",
      recurring:  { interval },
      metadata:   { merchantUserId: user.id, priceType },
    });

    // 4. Crear suscripción
    const subParams: Parameters<typeof stripe.subscriptions.create>[0] = {
      customer:          customer.id,
      items:             [{ price: price.id }],
      payment_behavior:  "default_incomplete",
      payment_settings:  { save_default_payment_method: "on_subscription" },
      expand:            ["latest_invoice.payment_intent"],
      metadata:          { merchantUserId: user.id, priceType },
    };
    if (trialDays && trialDays > 0) subParams.trial_period_days = trialDays;

    const subscription = await stripe.subscriptions.create(subParams);

    const invoice = subscription.latest_invoice as {
      payment_intent?: { client_secret?: string | null } | null
    } | null;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret:   invoice?.payment_intent?.client_secret ?? null,
      status:         subscription.status,
      customerId:     customer.id,
      productId:      product.id,
      priceId:        price.id,
      priceType,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[subscriptions POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}

// ─── GET /api/subscriptions ── Listar suscripciones ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const list = await stripe.subscriptions.list({
      limit: 50,
      expand: ["data.customer", "data.items.data.price.product"],
    });

    // Filtrar las del merchant actual
    const mine = list.data.filter((s) => s.metadata?.merchantUserId === user.id);

    const result = mine.map((s) => {
      const item    = s.items.data[0];
      const price   = item?.price;
      const product = price?.product as { name?: string } | undefined;
      const cust    = s.customer as { email?: string; name?: string } | string;
      return {
        id:           s.id,
        status:       s.status,
        priceType:    s.metadata?.priceType ?? "fixed",
        interval:     price?.recurring?.interval,
        amount:       price?.unit_amount,
        currency:     price?.currency,
        productName:  product?.name,
        customerEmail: typeof cust === "string" ? cust : cust.email,
        customerName:  typeof cust === "string" ? ""   : cust.name,
        currentPeriodEnd: new Date(s.current_period_end * 1000).toISOString(),
        trialEnd:     s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
        cancelAt:     s.cancel_at ? new Date(s.cancel_at * 1000).toISOString() : null,
      };
    });

    return NextResponse.json({ data: result, total: result.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
