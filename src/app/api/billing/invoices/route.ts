import { NextRequest, NextResponse } from "next/server";
import { requireAuth }               from "@/lib/auth";
import { db }                        from "@/lib/db";
import { stripe }                    from "@/lib/stripe";
import type Stripe                   from "stripe";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const account  = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) return NextResponse.json({ invoices: [] });

    const customers = await db.customer.findMany({
      where:  { connectedAccountId: account.id },
      select: { stripeCustomerId: true },
      take:   100,
    });

    if (customers.length === 0) return NextResponse.json({ invoices: [] });

    const stripeOpts = account.stripeAccountId.startsWith("local_")
      ? undefined
      : { stripeAccount: account.stripeAccountId };

    const targets = customers
      .slice(0, 20)
      .filter((c): c is { stripeCustomerId: string } => Boolean(c.stripeCustomerId));

    const allInvoices: Stripe.Invoice[] = (
      await Promise.all(
        targets.map((c) =>
          stripe.invoices
            .list({ customer: c.stripeCustomerId, limit: 10 }, stripeOpts)
            .then((r) => r.data)
            .catch(() => [] as Stripe.Invoice[]),
        ),
      )
    ).flat();

    allInvoices.sort((a, b) => b.created - a.created);

    return NextResponse.json({ invoices: allInvoices.slice(0, 50) }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[billing/invoices]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
