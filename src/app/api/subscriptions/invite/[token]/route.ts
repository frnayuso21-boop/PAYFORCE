/**
 * GET /api/subscriptions/invite/[token]
 * Valida el token y devuelve datos del cliente + SetupIntent clientSecret.
 * Llamado por la página /setup-card/[token] antes de mostrar el formulario.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invitation = await db.cardInvitation.findUnique({
    where:   { token },
    include: {
      customer: {
        include: {
          connectedAccount: { select: { businessName: true, stripeAccountId: true } },
        },
      },
    },
  });

  if (!invitation) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  if (invitation.usedAt) return NextResponse.json({ error: "This link has already been used" }, { status: 409 });

  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "Link expired" }, { status: 410 });

  // Crear un SetupIntent fresco para esta sesión
  const setupIntent = await stripe.setupIntents.create({
    customer:             invitation.customer.stripeCustomerId,
    usage:                "off_session",
    payment_method_types: ["card"],
    metadata: {
      cardInvitationId:   invitation.id,
      customerId:         invitation.customerId,
      connectedAccountId: invitation.customer.connectedAccountId,
    },
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    customerId:   invitation.customerId,
    customer: {
      name:  invitation.customer.name,
      email: invitation.customer.email,
    },
    business: {
      name: invitation.customer.connectedAccount.businessName,
    },
    expiresAt: invitation.expiresAt,
  });
}
