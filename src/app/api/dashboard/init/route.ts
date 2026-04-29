/**
 * GET /api/dashboard/init
 *
 * Endpoint consolidado que combina en 1 sola llamada lo que antes
 * eran 2 peticiones independientes al montar el dashboard:
 *   - GET /api/dashboard       → balance, payouts, disputes, connect
 *   - GET /api/onboarding/status → needsOnboarding
 *
 * Beneficio: 1 requireAuth → 1 validación Supabase + queries cacheadas,
 * en lugar de 2 requireAuth secuenciales con sus respectivas queries de BD.
 */
import { NextRequest, NextResponse }              from "next/server";
import { stripe }                                 from "@/lib/stripe";
import { db }                                     from "@/lib/db";
import { requireAuth, AuthError }                 from "@/lib/auth";
import { resolveConnectStatus }                   from "@/lib/connect";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const connectedAccount = await db.connectedAccount.findFirst({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // ── Onboarding ─────────────────────────────────────────────────────────
    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: {
        accountStatus:     true,
        emailVerified:     true,
        onboardingProfile: { select: { completedAt: true, mode: true } },
      },
    });

    const onboarding = {
      accountStatus:       dbUser?.accountStatus ?? "ONBOARDING_PENDING",
      emailVerified:       dbUser?.emailVerified  ?? false,
      needsOnboarding:     dbUser?.accountStatus  === "ONBOARDING_PENDING",
      onboardingCompleted: !!dbUser?.onboardingProfile?.completedAt,
      mode:                dbUser?.onboardingProfile?.mode ?? "test",
    };

    // ── Sin cuenta real → devolver datos vacíos ─────────────────────────────
    const hasRealAccount =
      connectedAccount?.stripeAccountId &&
      !connectedAccount.stripeAccountId.startsWith("local_");

    if (!hasRealAccount || !connectedAccount) {
      return NextResponse.json({
        onboarding,
        dashboard: {
          balance:        { available: { amount: 0, currency: "eur" }, pending: { amount: 0, currency: "eur" } },
          recentPayments: [],
          payouts:        [],
          disputes:       [],
          connect: connectedAccount ? {
            stripeAccountId:  connectedAccount.stripeAccountId,
            businessName:     connectedAccount.businessName,
            email:            connectedAccount.email,
            country:          connectedAccount.country,
            defaultCurrency:  connectedAccount.defaultCurrency,
            chargesEnabled:   connectedAccount.chargesEnabled,
            payoutsEnabled:   connectedAccount.payoutsEnabled,
            detailsSubmitted: connectedAccount.detailsSubmitted,
            status:           connectedAccount.status,
          } : null,
        },
      }, {
        headers: { "Cache-Control": "private, s-maxage=15, stale-while-revalidate=30" },
      });
    }

    const stripeOpts = { stripeAccount: connectedAccount.stripeAccountId };

    const [stripeAcc, balance, recentPayouts, recentPayments, disputes] = await Promise.all([
      stripe.accounts.retrieve(connectedAccount.stripeAccountId).catch(() => null),
      stripe.balance.retrieve({}, stripeOpts).catch(() => null),
      stripe.payouts.list({ limit: 5 }, stripeOpts)
        .then((r) => r.data)
        .catch(() => [] as import("stripe").default.Payout[]),
      db.payment.findMany({
        where:   { connectedAccountId: connectedAccount.id, status: "SUCCEEDED" },
        orderBy: { capturedAt: "desc" },
        take:    10,
        select: {
          id: true, amount: true, currency: true, description: true,
          applicationFeeAmount: true, netAmount: true, capturedAt: true,
        },
      }),
      db.dispute.findMany({
        where: {
          connectedAccountId: connectedAccount.id,
          status: { in: ["NEEDS_RESPONSE", "UNDER_REVIEW", "WARNING_NEEDS_RESPONSE"] },
        },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: { id: true, amount: true, currency: true, status: true, reason: true, createdAt: true },
      }),
    ]);

    let chargesEnabled   = connectedAccount.chargesEnabled;
    let payoutsEnabled   = connectedAccount.payoutsEnabled;
    let detailsSubmitted = connectedAccount.detailsSubmitted;
    let connectStatus    = connectedAccount.status;

    if (stripeAcc) {
      chargesEnabled   = stripeAcc.charges_enabled   ?? false;
      payoutsEnabled   = stripeAcc.payouts_enabled   ?? false;
      detailsSubmitted = stripeAcc.details_submitted ?? false;
      const resolved   = resolveConnectStatus(stripeAcc);
      connectStatus    = resolved;

      if (
        connectedAccount.chargesEnabled   !== chargesEnabled ||
        connectedAccount.payoutsEnabled   !== payoutsEnabled ||
        connectedAccount.detailsSubmitted !== detailsSubmitted ||
        connectedAccount.status           !== connectStatus
      ) {
        db.connectedAccount.update({
          where: { id: connectedAccount.id },
          data:  { chargesEnabled, payoutsEnabled, detailsSubmitted, status: connectStatus },
        }).catch(() => null);
      }
    }

    const currency = connectedAccount.defaultCurrency ?? "eur";

    return NextResponse.json({
      onboarding,
      dashboard: {
        balance: {
          available: { amount: balance?.available.find((b) => b.currency === currency)?.amount ?? 0, currency },
          pending:   { amount: balance?.pending.find((b) => b.currency === currency)?.amount   ?? 0, currency },
        },
        recentPayments,
        payouts: recentPayouts.map((p) => ({
          id:          p.id,
          amount:      p.amount,
          currency:    p.currency,
          status:      p.status,
          arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
          method:      p.method,
        })),
        disputes,
        connect: {
          stripeAccountId:  connectedAccount.stripeAccountId,
          businessName:     connectedAccount.businessName,
          email:            connectedAccount.email,
          country:          connectedAccount.country,
          defaultCurrency:  connectedAccount.defaultCurrency,
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
          status:           connectStatus,
        },
      },
    }, {
      headers: { "Cache-Control": "private, s-maxage=15, stale-while-revalidate=30" },
    });

  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/init]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
