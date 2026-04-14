import { NextRequest, NextResponse }           from "next/server";
import { stripe }                              from "@/lib/stripe";
import { db }                                  from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";
import { checkRateLimit, getClientIp }         from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ─── GET /api/payment-links/[token] ──────────────────────────────────────────
// Uso interno de la página /pay/[token] (server component).
// Devuelve detalles del link + clientSecret del PaymentIntent.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // ── Rate limit por IP: 60 req/min (página de pago pública) ───────────────
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pay-token-get:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  try {
    const { token } = await params;
    const link = await db.paymentLink.findUnique({
      where: { token },
    });

    if (!link) {
      return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
    }

    // Comprobar expiración
    if (link.expiresAt && link.expiresAt < new Date() && link.status === "open") {
      await db.paymentLink.update({
        where: { id: link.id },
        data:  { status: "expired" },
      });
      return NextResponse.json({ error: "Link expirado", status: "expired" }, { status: 410 });
    }

    if (link.status !== "open") {
      return NextResponse.json(
        { error: "Link no disponible", status: link.status },
        { status: 410 }
      );
    }

    // Obtener clientSecret desde Stripe
    const pi = await stripe.paymentIntents.retrieve(link.stripePaymentIntentId!);

    return NextResponse.json({
      id:           link.id,
      token:        link.token,
      amount:       link.amount,
      currency:     link.currency,
      status:       link.status,
      description:  link.description,
      customerEmail: link.customerEmail,
      customerName:  link.customerName,
      expiresAt:    link.expiresAt,
      clientSecret: pi.client_secret,
    });
  } catch (err) {
    console.error("[payment-links token GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── PATCH /api/payment-links/[token] ────────────────────────────────────────
// Cancela un link (solo si está open).
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // ── Requiere usuario autenticado ──────────────────────────────────────────
    const { user } = await requireAuth(req);

    // ── Rate limit: 10 cancelaciones/min por usuario ──────────────────────────
    const rl = checkRateLimit(`pay-token-patch:${user.id}`, { windowMs: 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." },
        { status: 429 },
      );
    }

    const { token } = await params;
    const { action } = (await req.json()) as { action: "cancel" };

    if (action !== "cancel") {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

    const link = await db.paymentLink.findUnique({ where: { token } });

    if (!link) {
      return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
    }

    // ── Verificar propiedad: el link debe pertenecer al usuario ───────────────
    const ownsViaCreator = link.createdById === user.id;
    const accountIds     = await getUserAccountIds(user.id);
    const ownsViaAccount = accountIds.includes(link.connectedAccountId);
    if (!ownsViaCreator && !ownsViaAccount) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (link.status !== "open") {
      return NextResponse.json(
        { error: `No se puede cancelar un link con estado '${link.status}'` },
        { status: 422 }
      );
    }

    // Cancelar el PaymentIntent en Stripe
    if (link.stripePaymentIntentId) {
      await stripe.paymentIntents.cancel(link.stripePaymentIntentId).catch(() => null);
    }

    const updated = await db.paymentLink.update({
      where: { id: link.id },
      data:  { status: "canceled" },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[payment-links token PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
