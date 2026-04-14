import { NextRequest }            from "next/server";
import { db }                     from "@/lib/db";
import { requireApiKey, apiOk, apiError, ApiAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/customers — Lista clientes */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiKey(req);
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const q      = searchParams.get("q") ?? undefined;

    const customers = await db.customer.findMany({
      where: {
        connectedAccountId: ctx.accountId,
        ...(q && { OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ]}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, name: true, email: true, phone: true, currency: true, totalSpend: true, createdAt: true },
    });

    const hasMore = customers.length > limit;
    const data    = hasMore ? customers.slice(0, -1) : customers;
    return apiOk({ object: "list", data, has_more: hasMore, next_cursor: hasMore ? data[data.length - 1]?.id : null });
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    return apiError(500, "internal_error", "Error interno.");
  }
}

/** POST /api/v1/customers — Crea un cliente */
export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireApiKey(req);
    const body = await req.json();
    const { name, email, phone, currency = "eur" } = body;
    if (!name || !email) return apiError(422, "invalid_param", "'name' y 'email' son obligatorios.");

    const account = await db.connectedAccount.findUnique({ where: { id: ctx.accountId } });
    if (!account?.stripeAccountId) return apiError(422, "account_not_ready", "Cuenta Stripe no configurada.");

    const { stripe } = await import("@/lib/stripe");
    const sc = await stripe.customers.create({ name, email, phone }, { stripeAccount: account.stripeAccountId });

    const customer = await db.customer.upsert({
      where:  { connectedAccountId_email: { connectedAccountId: ctx.accountId, email } },
      update: { name, phone: phone ?? null },
      create: { connectedAccountId: ctx.accountId, stripeCustomerId: sc.id, name, email, phone: phone ?? null, currency },
    });

    return apiOk({ object: "customer", ...customer }, 201);
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    return apiError(500, "internal_error", "Error interno.");
  }
}
