import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  console.log("=== ACCOUNT SESSION DEBUG ===");

  try {
    const { user } = await requireAuth(req);
    console.log("User:", user?.id);

    let stripeAccountId: string | null = null;
    let body: { accountId?: string } = {};
    try { body = await req.json(); } catch { /* sin body */ }

    if (body.accountId) {
      const account = await db.connectedAccount.findFirst({
        where: { stripeAccountId: body.accountId, userId: user.id },
      });
      if (!account) {
        console.error("Cuenta no encontrada:", body.accountId);
        return NextResponse.json({ error: "Cuenta no encontrada o sin permisos" }, { status: 403 });
      }
      stripeAccountId = body.accountId;
    } else {
      const primary = await getUserPrimaryAccount(user.id);
      if (!primary) {
        console.error("No hay cuenta activa para user:", user.id);
        return NextResponse.json(
          { error: "No tienes ninguna cuenta activa. Completa el onboarding primero." },
          { status: 422 },
        );
      }
      stripeAccountId = primary.stripeAccountId;
    }

    console.log("Stripe Account ID:", stripeAccountId);

    if (!stripeAccountId || stripeAccountId.startsWith("local_")) {
      console.error("Account ID inválido o placeholder:", stripeAccountId);
      return NextResponse.json(
        { error: "La cuenta aún no está registrada en Stripe. Completa el onboarding." },
        { status: 422 },
      );
    }

    try {
      const accountSession = await stripe.accountSessions.create({
        account: stripeAccountId,
        components: {
          account_onboarding: {
            enabled:  true,
            features: { external_account_collection: true },
          },
          account_management: {
            enabled:  true,
            features: { external_account_collection: true },
          },
          notification_banner: {
            enabled:  true,
            features: { external_account_collection: true },
          },
          payments: {
            enabled:  true,
            features: {
              refund_management:  true,
              dispute_management: true,
              capture_payments:   true,
            },
          },
          payouts: {
            enabled:  true,
            features: {
              instant_payouts:             true,
              standard_payouts:            true,
              edit_payout_schedule:        true,
              external_account_collection: true,
            },
          },
          balances: {
            enabled:  true,
            features: {
              instant_payouts:      true,
              standard_payouts:     true,
              edit_payout_schedule: true,
            },
          },
        },
      });

      console.log("Account session created:", accountSession.client_secret?.slice(0, 20) + "…");
      return NextResponse.json({ client_secret: accountSession.client_secret });

    } catch (stripeErr) {
      console.error("=== STRIPE ERROR ===", stripeErr);
      const msg = (stripeErr as { message?: string })?.message ?? "Error desconocido de Stripe";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

  } catch (err) {
    if (err instanceof AuthError) {
      console.error("Auth error:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = (err as { message?: string })?.message ?? "Error interno";
    console.error("=== ERROR INESPERADO ===", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
