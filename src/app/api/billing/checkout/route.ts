import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

// Price IDs reales de Stripe — mapeo plan → price
const PLAN_PRICES: Record<string, string> = {
  starter:    "price_1TMUAgKd9t7mkjK9oDz7zMPR",
  pro:        "price_1TMUAgKd9t7mkjK9oDz7zMPR",
  enterprise: "price_1TMUAgKd9t7mkjK9oDz7zMPR",
};

/**
 * POST /api/billing/checkout
 *
 * Crea una Stripe Checkout Session en modo "subscription".
 * Devuelve { url } para redirigir al merchant al checkout de Stripe.
 *
 * Body: { plan: "starter" | "pro" | "enterprise" }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = await req.json() as { plan?: string };
    const plan  = body.plan ?? "pro";

    const priceId = PLAN_PRICES[plan] ?? PLAN_PRICES.pro;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price:    priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id, plan },
      },
      metadata: { userId: user.id, plan },
      success_url: `${appUrl}/app/dashboard?checkout=success`,
      cancel_url:  `${appUrl}/checkout?plan=${plan}`,
    });

    return NextResponse.json({ url: session.url }, { status: 201 });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
