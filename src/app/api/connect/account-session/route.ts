import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    let stripeAccountId: string | null = null;
    let body: { accountId?: string } = {};
    try { body = await req.json(); } catch { /* sin body */ }

    if (body.accountId) {
      const account = await db.connectedAccount.findFirst({
        where: { stripeAccountId: body.accountId, userId: user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Cuenta no encontrada o sin permisos" }, { status: 403 });
      }
      stripeAccountId = body.accountId;
    } else {
      const primary = await getUserPrimaryAccount(user.id);
      if (!primary) {
        return NextResponse.json(
          { error: "No tienes ninguna cuenta activa. Completa el onboarding primero." },
          { status: 422 },
        );
      }
      stripeAccountId = primary.stripeAccountId;
    }

    if (!stripeAccountId || stripeAccountId.startsWith("local_")) {
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

      return NextResponse.json({ client_secret: accountSession.client_secret });

    } catch (stripeErr) {
      console.error("[connect/account-session] Stripe error", stripeErr);
      const msg = (stripeErr as { message?: string })?.message ?? "Error desconocido de Stripe";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[connect/account-session]", err);
    const msg = (err as { message?: string })?.message ?? "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
