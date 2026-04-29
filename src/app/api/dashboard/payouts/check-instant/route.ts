import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/dashboard/payouts/check-instant
// Diagnóstico: lista las external accounts y si soportan instant payouts.
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account?.stripeAccountId || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json({ error: "Cuenta Stripe no configurada" }, { status: 404 });
    }

    const externalAccounts = await stripe.accounts.listExternalAccounts(
      account.stripeAccountId,
      { limit: 10 },
    );

    const results = externalAccounts.data.map((ea) => {
      const typed = ea as {
        id: string; object: string; last4: string;
        available_payout_methods?: string[];
        bank_name?: string; brand?: string;
        currency?: string; country?: string;
      };
      return {
        id:                       typed.id,
        type:                     typed.object,
        last4:                    typed.last4,
        currency:                 typed.currency,
        country:                  typed.country,
        bank_name:                typed.bank_name  ?? null,
        brand:                    typed.brand       ?? null,
        available_payout_methods: typed.available_payout_methods ?? [],
        instantAvailable:         typed.available_payout_methods?.includes("instant") ?? false,
      };
    });

    return NextResponse.json({
      stripeAccountId: account.stripeAccountId,
      externalAccounts: results,
      summary: {
        total:            results.length,
        withInstant:      results.filter((r) => r.instantAvailable).length,
        withoutInstant:   results.filter((r) => !r.instantAvailable).length,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[check-instant]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
