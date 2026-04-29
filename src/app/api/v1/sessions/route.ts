// @ts-nocheck
/**
 * POST /api/v1/sessions
 *
 * API pública autenticada por API Key.
 * Permite a cualquier ecommerce, SaaS o marketplace crear sesiones de pago
 * de forma programática y redirigir al cliente a la página de pago de PayForce.
 *
 * Autenticación: Authorization: Bearer pf_live_xxx
 *
 * Body:
 *   amount      number   Importe en céntimos (ej. 2999 = €29,99)
 *   currency    string   Moneda ISO 4217 (default: eur)
 *   description string?  Descripción visible al cliente
 *   success_url string?  URL a la que redirigir tras pago exitoso
 *   cancel_url  string?  URL a la que redirigir si el cliente cancela
 *   metadata    object?  Datos arbitrarios (referencia pedido, userId, etc.)
 *   customer_email string?
 *   customer_name  string?
 *   expires_in  number?  Segundos hasta expiración (default: 3600)
 *
 * Response 201:
 *   { id, checkout_url, amount, currency, status, expires_at }
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes }               from "crypto";
import { db }                        from "@/lib/db";
import { stripe }                    from "@/lib/stripe";
import { hashApiToken }              from "@/lib/api-key";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_CURRENCIES = new Set([
  "eur","usd","gbp","chf","sek","nok","dkk","pln","czk","huf","ron","bgn",
]);
import { calculateFee } from "@/lib/fees";
const calcFee = (amount: number) => calculateFee(amount);

function getAppUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && !env.includes("localhost")) return env.replace(/\/$/, "");
  const host  = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function POST(req: NextRequest) {
  // ── Rate limit por IP ─────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl  = checkRateLimit(`v1-sessions:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // ── Autenticación por API Key ─────────────────────────────────────────────
  const rawToken = extractBearerToken(req);
  if (!rawToken || !rawToken.startsWith("pf_live_")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Authorization: Bearer pf_live_xxx" },
      { status: 401 },
    );
  }

  const keyHash = hashApiToken(rawToken);
  const apiKey  = await db.apiKey.findUnique({
    where:   { keyHash },
    include: { connectedAccount: true },
  });

  if (!apiKey || !apiKey.isActive) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired." }, { status: 401 });
  }

  // Actualizar lastUsedAt en background
  void db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  const account = apiKey.connectedAccount;

  // ── Parsear body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount         = body.amount         as number;
  const currency       = ((body.currency       as string) ?? "eur").toLowerCase();
  const description    = (body.description    as string)  ?? undefined;
  const successUrl     = (body.success_url    as string)  ?? undefined;
  const cancelUrl      = (body.cancel_url     as string)  ?? undefined;
  const customerEmail  = (body.customer_email as string)  ?? undefined;
  const customerName   = (body.customer_name  as string)  ?? undefined;
  const metadata       = (body.metadata       as Record<string, string>) ?? {};
  const expiresIn      = typeof body.expires_in === "number" ? body.expires_in : 3600;

  // ── Validaciones ──────────────────────────────────────────────────────────
  if (!Number.isInteger(amount) || amount < 50) {
    return NextResponse.json({ error: "amount must be an integer ≥ 50 (cents)." }, { status: 400 });
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ error: "amount exceeds maximum (1,000,000 cents = €10,000)." }, { status: 400 });
  }
  if (!VALID_CURRENCIES.has(currency)) {
    return NextResponse.json({ error: `Unsupported currency: ${currency}` }, { status: 400 });
  }
  if (successUrl && !isValidUrl(successUrl)) {
    return NextResponse.json({ error: "Invalid success_url." }, { status: 400 });
  }
  if (cancelUrl && !isValidUrl(cancelUrl)) {
    return NextResponse.json({ error: "Invalid cancel_url." }, { status: 400 });
  }
  if (expiresIn < 60 || expiresIn > 86400) {
    return NextResponse.json({ error: "expires_in must be between 60 and 86400 seconds." }, { status: 400 });
  }

  const platformFee = calcFee(amount);
  if (amount - platformFee <= 0) {
    return NextResponse.json({ error: `Amount too low to cover platform fee (${platformFee} cents).` }, { status: 400 });
  }

  // ── Crear PaymentIntent en Stripe ─────────────────────────────────────────
  const token     = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const rawDescriptor = (account.statementDescriptor || account.businessName || "PAYFORCE");
  const statementDescriptorSuffix = rawDescriptor
    .substring(0, 22)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();

  const pi = await stripe.paymentIntents.create({
    amount,
    currency,
    description,
    automatic_payment_methods: { enabled: true },
    ...(statementDescriptorSuffix ? { statement_descriptor_suffix: statementDescriptorSuffix } : {}),
    metadata: {
      paymentLinkToken:    token,
      connectedAccountId:  account.id,
      platformFee:         String(platformFee),
      source:              "api_v1",
      ...Object.fromEntries(
        Object.entries(metadata).slice(0, 10).map(([k, v]) => [k, String(v)]),
      ),
    },
  });

  // ── Guardar PaymentLink en BD ─────────────────────────────────────────────
  const link = await db.paymentLink.create({
    data: {
      token,
      stripePaymentIntentId: pi.id,
      connectedAccountId:    account.id,
      apiKeyId:              apiKey.id,
      amount,
      currency,
      applicationFeeAmount:  platformFee,
      description:   description  ?? null,
      customerEmail: customerEmail ?? null,
      customerName:  customerName  ?? null,
      successUrl:    successUrl   ?? null,
      cancelUrl:     cancelUrl    ?? null,
      maxUses:       1,
      status:        "open",
      expiresAt,
      metadata:      Object.keys(metadata).length ? JSON.stringify(metadata) : null,
    },
  });

  const baseUrl     = getAppUrl(req);
  const checkoutUrl = `${baseUrl}/checkout/${link.token}`;

  return NextResponse.json(
    {
      id:           link.id,
      checkout_url: checkoutUrl,
      amount:       link.amount,
      currency:     link.currency,
      status:       link.status,
      expires_at:   link.expiresAt,
      created_at:   link.createdAt,
    },
    { status: 201 },
  );
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
