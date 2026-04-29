import { NextRequest, NextResponse }  from "next/server";
import { randomBytes }                from "crypto";
import { stripe }                     from "@/lib/stripe";
import { db }                         from "@/lib/db";
import {
  requireAuth,
  getUserAccountIds,
  getUserPrimaryAccount,
  AuthError,
}                                     from "@/lib/auth";
import { logAuthSecurityAudit }       from "@/lib/supabaseSecurityAudit";
import { checkRateLimit }             from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Devuelve el origen real de la request (funciona en local, red local y producción)
function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  // En producción siempre usamos la variable de entorno
  if (envUrl && !envUrl.includes("localhost")) return envUrl.replace(/\/$/, "");
  // En desarrollo usamos el host real de la request (soporta IP de red para móvil)
  const host   = req.headers.get("host") ?? "localhost:3000";
  const proto  = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Monedas soportadas por Stripe (subconjunto relevante)
const VALID_CURRENCIES = new Set([
  "eur","usd","gbp","chf","sek","nok","dkk","pln","czk","huf","ron","bgn",
]);

import { calculateFee } from "@/lib/fees";

function calcPlatformFee(amount: number): number {
  return calculateFee(amount);
}

// ─── POST /api/payment-links ──────────────────────────────────────────────────

interface CreateLinkBody {
  amount:              number;
  currency?:           string;
  description?:        string;
  connectedAccountId?: string;
  customerEmail?:      string;
  customerName?:       string;
  customerPhone?:      string;
  expiresAt?:          string;
  maxUses?:            number;
  metadata?:           Record<string, string>;
  reminderEnabled?:    boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { user } = session;

    const rl = checkRateLimit(`payment-links-create:${user.id}`, { windowMs: 60_000, max: 20 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." },
        {
          status:  429,
          headers: {
            "Retry-After":           String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const body = (await req.json()) as CreateLinkBody;
    const {
      amount,
      currency         = "eur",
      description,
      connectedAccountId: bodyAccountId,
      customerEmail,
      customerName,
      customerPhone,
      expiresAt,
      maxUses          = 1,
      metadata         = {},
      reminderEnabled  = false,
    } = body;

    // ── Validaciones ─────────────────────────────────────────────────────────
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 50) {
      return NextResponse.json(
        { error: "El importe mínimo es 50 céntimos (€0,50)" },
        { status: 400 },
      );
    }
    if (amount > 1_000_000) {
      return NextResponse.json(
        { error: "El importe máximo es €10.000 (1.000.000 céntimos)" },
        { status: 400 },
      );
    }
    if (!VALID_CURRENCIES.has(currency.toLowerCase())) {
      return NextResponse.json(
        { error: `Moneda no soportada: ${currency}` },
        { status: 400 },
      );
    }
    if (maxUses !== undefined && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000)) {
      return NextResponse.json(
        { error: "maxUses debe ser un entero entre 1 y 1000" },
        { status: 400 },
      );
    }

    // ── Calcular fees ANTES de validar contra el importe ─────────────────────
    const platformFee         = calcPlatformFee(amount);
    const amountToPayMerchant = amount - platformFee;

    if (amountToPayMerchant <= 0) {
      return NextResponse.json(
        { error: `El importe (${amount} cts) es demasiado bajo para cubrir la comisión de plataforma (${platformFee} cts).` },
        { status: 400 },
      );
    }

    // ── Resolver ConnectedAccount ──────────────────────────────────────────
    let stripeAccountId = bodyAccountId;

    if (!stripeAccountId) {
      const primary = await getUserPrimaryAccount(user.id);
      if (!primary) {
        return NextResponse.json(
          { error: "No tienes una cuenta activa. Completa tu perfil en Ajustes → Cuenta bancaria." },
          { status: 422 },
        );
      }
      stripeAccountId = primary.stripeAccountId;
    }

    // Verificar propiedad siempre — sin importar si el usuario tiene cuentas o no
    if (bodyAccountId) {
      const owns = await db.connectedAccount.findFirst({
        where: { stripeAccountId: bodyAccountId, userId: user.id },
      });
      if (!owns) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    // Obtener (o crear) el ConnectedAccount local para la FK
    let account = await db.connectedAccount.findFirst({
      where: { stripeAccountId },
      select: {
        id: true, stripeAccountId: true, chargesEnabled: true,
        payoutsEnabled: true, detailsSubmitted: true, status: true,
        userId: true,
        customDomain: true, customDomainVerified: true,
      },
    });
    if (!account) {
      account = await db.connectedAccount.create({
        data: { stripeAccountId, status: "PENDING", userId: user.id },
      });
    }

    // ── Sincronización defensiva con Stripe en producción ────────────────────
    // En la práctica, `chargesEnabled` puede quedar stale si el webhook account.updated
    // no llegó o si el usuario no ha pasado por /api/connect/status. Antes de decidir
    // "modo test", intentamos refrescar el estado directamente desde Stripe.
    if (
      account.stripeAccountId &&
      !account.stripeAccountId.startsWith("local_") &&
      !account.chargesEnabled
    ) {
      try {
        const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId);
        await db.connectedAccount.update({
          where: { id: account.id },
          data: {
            chargesEnabled:   stripeAccount.charges_enabled ?? false,
            payoutsEnabled:   stripeAccount.payouts_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
          },
        });
        account = {
          ...account,
          chargesEnabled:   stripeAccount.charges_enabled ?? false,
          payoutsEnabled:   stripeAccount.payouts_enabled ?? false,
          detailsSubmitted: stripeAccount.details_submitted ?? false,
        };
      } catch {
        // Si Stripe falla aquí, seguimos con el valor de BD (fallback seguro).
      }
    }

    // ── Modo test/fallback: cuenta sin Stripe real o sin capabilities ────────────
    // Incluye: placeholder local_, cuenta no conectada o cuenta sin chargesEnabled
    if (
      !account.stripeAccountId ||
      account.stripeAccountId.startsWith("local_") ||
      !account.chargesEnabled
    ) {
      const isNotActivated =
        account.stripeAccountId &&
        !account.stripeAccountId.startsWith("local_") &&
        !account.chargesEnabled;

      const token = randomBytes(16).toString("hex");
      const link  = await db.paymentLink.create({
        data: {
          token,
          stripePaymentIntentId: `pi_test_${token}`,
          connectedAccountId:    account.id,
          createdById:           user.id,
          amount,
          currency,
          applicationFeeAmount:  0,
          description:     description   ?? null,
          customerEmail:   customerEmail ?? null,
          customerName:    customerName  ?? null,
          customerPhone:   customerPhone ?? null,
          reminderEnabled: reminderEnabled,
          maxUses,
          status:    "open",
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          metadata:  JSON.stringify({
            testMode: "true",
            reason: isNotActivated ? "account_not_activated" : "no_stripe_account",
            ...metadata,
          }),
        },
      });

      if (reminderEnabled) {
        const next3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await db.paymentReminder.create({
          data: {
            paymentLinkId:      link.id,
            connectedAccountId: account.id,
            customerEmail:      customerEmail ?? null,
            customerPhone:      customerPhone ?? null,
            customerName:       customerName  ?? null,
            amount,
            currency,
            status:         "pending",
            nextReminderAt: next3d,
          },
        });
      }

      const linkBaseUrl = (account?.customDomain && account?.customDomainVerified)
      ? `https://${account.customDomain}`
      : getBaseUrl(req);
    const url = `${linkBaseUrl}/pay/${token}`;
      await logAuthSecurityAudit(req, session, {
        action:   "PAYMENT_LINK_CREATED",
        resource: "payment_link",
        metadata: { linkId: link.id, token, amount: link.amount, testMode: true },
      });
      return NextResponse.json(
        {
          id: link.id, token, url,
          amount:    link.amount,
          currency:  link.currency,
          status:    link.status,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
          testMode:  true,
          warning: isNotActivated
            ? "Tu cuenta Stripe aún no tiene pagos activados. Completa el onboarding en Ajustes → Cuenta bancaria para aceptar cobros reales."
            : undefined,
        },
        { status: 201 },
      );
    }

    // ── Crear PaymentIntent en Stripe — Destination Charge ────────────────────
    // application_fee_amount: comisión de PayForce (4% + 40cts)
    // transfer_data.destination: la cuenta Express del merchant recibe el neto automáticamente
    const token = randomBytes(16).toString("hex");

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      application_fee_amount: platformFee,
      transfer_data: { destination: account.stripeAccountId },
      automatic_payment_methods: { enabled: true },
      metadata: {
        paymentLinkToken: token,
        stripeAccountId:  account.stripeAccountId, // para lookup en webhook
        platformFee:      String(platformFee),
        ...metadata,
      },
    });

    // ── Guardar en BD ─────────────────────────────────────────────────────────
    const link = await db.paymentLink.create({
      data: {
        token,
        stripePaymentIntentId: pi.id,
        connectedAccountId:    account.id,
        createdById:           user.id,
        amount,
        currency,
        applicationFeeAmount: platformFee,
        description:     description   ?? null,
        customerEmail:   customerEmail ?? null,
        customerName:    customerName  ?? null,
        customerPhone:   customerPhone ?? null,
        reminderEnabled: reminderEnabled,
        maxUses,
        status:    "open",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata:  Object.keys(metadata).length ? JSON.stringify(metadata) : null,
      },
    });

    if (reminderEnabled) {
      const next3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await db.paymentReminder.create({
        data: {
          paymentLinkId:      link.id,
          connectedAccountId: account.id,
          customerEmail:      customerEmail ?? null,
          customerPhone:      customerPhone ?? null,
          customerName:       customerName  ?? null,
          amount,
          currency,
          status:         "pending",
          nextReminderAt: next3d,
        },
      });
    }

    const realBaseUrl = (account?.customDomain && account?.customDomainVerified)
      ? `https://${account.customDomain}`
      : getBaseUrl(req);
    const url = `${realBaseUrl}/pay/${token}`;

    await logAuthSecurityAudit(req, session, {
      action:   "PAYMENT_LINK_CREATED",
      resource: "payment_link",
      metadata: { linkId: link.id, token, amount: link.amount },
    });

    return NextResponse.json(
      { id: link.id, token, url, amount: link.amount, currency: link.currency, status: link.status, expiresAt: link.expiresAt, createdAt: link.createdAt },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[payment-links POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}

// ─── GET /api/payment-links ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const rl = checkRateLimit(`payment-links-list:${user.id}`, { windowMs: 60_000, max: 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." },
        { status: 429 },
      );
    }

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status") ?? undefined;

    const accountIds = await getUserAccountIds(user.id);

    const where = {
      ...(accountIds.length > 0 ? { connectedAccountId: { in: accountIds } } : { createdById: user.id }),
      ...(status ? { status } : {}),
    };

    const [rows, total] = await Promise.all([
      db.paymentLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id: true, token: true, stripePaymentIntentId: true,
          amount: true, currency: true, applicationFeeAmount: true,
          status: true, description: true, customerEmail: true,
          customerName: true, maxUses: true, usedCount: true,
          expiresAt: true, createdAt: true, updatedAt: true,
        },
      }),
      db.paymentLink.count({ where }),
    ]);

    return NextResponse.json({
      data: rows.map((r) => ({ ...r, url: `${getBaseUrl(req)}/pay/${r.token}` })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[payment-links GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
