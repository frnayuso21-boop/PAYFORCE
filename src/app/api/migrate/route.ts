/**
 * POST /api/migrate
 * Endpoint seguro que recibe credenciales de Stripe o LemonSqueezy
 * y migra clientes + productos + historial de pagos a PayForce.
 * Autenticado con API key de PayForce.
 */
import { NextRequest }            from "next/server";
import { db }                     from "@/lib/db";
import { requireApiKey, apiOk, apiError, ApiAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type MigrateSource = "stripe" | "lemon_squeezy";

interface MigrateBody {
  source:          MigrateSource;
  stripe_secret?:  string;
  ls_api_key?:     string;
  dry_run?:        boolean;
}

export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireApiKey(req);
    const body = (await req.json()) as MigrateBody;
    const { source, stripe_secret, ls_api_key, dry_run = false } = body;

    const account = await db.connectedAccount.findUnique({ where: { id: ctx.accountId } });
    if (!account) return apiError(404, "not_found", "Cuenta no encontrada.");

    const report = {
      source,
      dry_run,
      started_at: new Date().toISOString(),
      customers:  { migrated: 0, skipped: 0, errors: 0 },
      products:   { migrated: 0, skipped: 0, errors: 0 },
      payments:   { migrated: 0, skipped: 0, errors: 0 },
      errors:     [] as string[],
    };

    // ─────────────────── STRIPE ────────────────────────────────────────────────
    if (source === "stripe") {
      if (!stripe_secret?.startsWith("sk_")) {
        return apiError(422, "invalid_param", "'stripe_secret' debe empezar por sk_live_ o sk_test_.");
      }

      const Stripe = (await import("stripe")).default;
      const srcStripe = new Stripe(stripe_secret, { apiVersion: "2024-06-20" });

      // --- Clientes ---
      let customersCursor: string | undefined;
      do {
        const page = await srcStripe.customers.list({ limit: 100, starting_after: customersCursor });
        for (const c of page.data) {
          try {
            const email = c.email ?? `migrated_${c.id}@payforce.io`;
            const existing = await db.customer.findFirst({
              where: { connectedAccountId: ctx.accountId, email },
            });
            if (existing) { report.customers.skipped++; continue; }

            if (!dry_run) {
              await db.customer.create({
                data: {
                  connectedAccountId: ctx.accountId,
                  stripeCustomerId:   `migrated_${c.id}`,
                  name:               c.name ?? "Migrated Customer",
                  email,
                  phone:              c.phone ?? null,
                },
              });
            }
            report.customers.migrated++;
          } catch { report.customers.errors++; }
        }
        customersCursor = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
      } while (customersCursor);

      // --- Productos ---
      let productsCursor: string | undefined;
      do {
        const page = await srcStripe.products.list({ limit: 100, starting_after: productsCursor });
        for (const p of page.data) {
          try {
            const existing = await db.product.findFirst({
              where: { connectedAccountId: ctx.accountId, name: p.name },
            });
            if (existing) { report.products.skipped++; continue; }

            // Obtener precio por defecto
            let price = 0;
            if (p.default_price) {
              const priceObj = await srcStripe.prices.retrieve(p.default_price as string);
              price = priceObj.unit_amount ?? 0;
            }

            if (!dry_run) {
              await db.product.create({
                data: {
                  connectedAccountId: ctx.accountId,
                  name:        p.name,
                  description: p.description ?? null,
                  imageUrl:    p.images?.[0] ?? null,
                  price,
                  currency:    "eur",
                  active:      p.active,
                },
              });
            }
            report.products.migrated++;
          } catch (err) {
            report.products.errors++;
            report.errors.push(`Product ${p.id}: ${String(err)}`);
          }
        }
        productsCursor = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
      } while (productsCursor);

      // --- Pagos (últimos 6 meses) ---
      const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180;
      let piCursor: string | undefined;
      do {
        const page = await srcStripe.paymentIntents.list({
          limit: 100, starting_after: piCursor, created: { gte: since },
        });
        for (const pi of page.data) {
          try {
            const existing = await db.payment.findFirst({
              where: { stripePaymentIntentId: pi.id },
            });
            if (existing) { report.payments.skipped++; continue; }

            if (!dry_run) {
              await db.payment.create({
                data: {
                  connectedAccountId:    ctx.accountId,
                  stripePaymentIntentId: pi.id,
                  amount:                pi.amount,
                  currency:              pi.currency,
                  status:                pi.status.toUpperCase(),
                  description:           pi.description ?? null,
                  customerEmail:         typeof pi.receipt_email === "string" ? pi.receipt_email : null,
                  applicationFeeAmount:  0,
                  netAmount:             pi.amount,
                  stripeCreatedAt:       new Date(pi.created * 1000),
                },
              });
            }
            report.payments.migrated++;
          } catch { report.payments.errors++; }
        }
        piCursor = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
      } while (piCursor);
    }

    // ─────────────────── LEMON SQUEEZY ────────────────────────────────────────
    if (source === "lemon_squeezy") {
      if (!ls_api_key) return apiError(422, "invalid_param", "'ls_api_key' es obligatorio para Lemon Squeezy.");

      const headers = { Authorization: `Bearer ${ls_api_key}`, Accept: "application/vnd.api+json" };
      const base    = "https://api.lemonsqueezy.com/v1";

      // --- Clientes (orders) ---
      let ordersPage = 1;
      let hasMore    = true;
      while (hasMore) {
        const res  = await fetch(`${base}/orders?page[number]=${ordersPage}&page[size]=100`, { headers });
        const json = await res.json() as { data?: { id: string; attributes: { user_email: string; user_name: string; total: number; currency: string; status: string; created_at: string } }[]; meta?: { page?: { lastPage?: number } } };
        if (!json.data) break;

        for (const order of json.data) {
          const a     = order.attributes;
          const email = a.user_email;
          try {
            const existing = await db.payment.findFirst({
              where: { stripePaymentIntentId: `ls_order_${order.id}` },
            });
            if (existing) { report.payments.skipped++; continue; }

            if (!dry_run) {
              await db.payment.create({
                data: {
                  connectedAccountId:    ctx.accountId,
                  stripePaymentIntentId: `ls_order_${order.id}`,
                  amount:                a.total,
                  currency:              a.currency.toLowerCase(),
                  status:                a.status === "paid" ? "SUCCEEDED" : "FAILED",
                  customerEmail:         email,
                  customerName:          a.user_name,
                  applicationFeeAmount:  0,
                  netAmount:             a.total,
                  stripeCreatedAt:       new Date(a.created_at),
                },
              });
            }
            report.payments.migrated++;

            // Cliente
            const custExist = await db.customer.findFirst({ where: { connectedAccountId: ctx.accountId, email } });
            if (!custExist && !dry_run) {
              await db.customer.create({
                data: {
                  connectedAccountId: ctx.accountId,
                  stripeCustomerId:   `ls_customer_${order.id}`,
                  name:               a.user_name,
                  email,
                },
              });
              report.customers.migrated++;
            }
          } catch { report.payments.errors++; }
        }

        const lastPage = json.meta?.page?.lastPage ?? 1;
        hasMore = ordersPage < lastPage;
        ordersPage++;
      }

      // --- Productos ---
      const pRes  = await fetch(`${base}/products?page[size]=100`, { headers });
      const pJson = await pRes.json() as { data?: { id: string; attributes: { name: string; description?: string; price?: number; status?: string } }[] };
      for (const p of pJson.data ?? []) {
        try {
          const existing = await db.product.findFirst({ where: { connectedAccountId: ctx.accountId, name: p.attributes.name } });
          if (existing) { report.products.skipped++; continue; }
          if (!dry_run) {
            await db.product.create({
              data: {
                connectedAccountId: ctx.accountId,
                name:               p.attributes.name,
                description:        p.attributes.description ?? null,
                price:              p.attributes.price ?? 0,
                currency:           "usd",
                active:             p.attributes.status === "published",
              },
            });
          }
          report.products.migrated++;
        } catch { report.products.errors++; }
      }
    }

    return apiOk({
      ...report,
      finished_at: new Date().toISOString(),
      message: dry_run
        ? "Dry-run completado. Ningún dato ha sido modificado."
        : `Migración completada. ${report.customers.migrated} clientes, ${report.products.migrated} productos, ${report.payments.migrated} pagos importados.`,
    });
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    console.error(e);
    return apiError(500, "internal_error", "Error durante la migración.");
  }
}
