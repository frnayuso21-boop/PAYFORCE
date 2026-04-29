/**
 * PATCH /api/subscriptions/customers/[id]
 * Actualiza stripePaymentMethodId y/o status del cliente.
 *
 * Autorización: o bien sesión autenticada del merchant propietario, o bien
 * un token válido de cardInvitation que apunte a este customerId. La página
 * pública /pay/setup-card/[token] usa la segunda vía.
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: {
    stripePaymentMethodId?: string;
    status?:               string;
    inviteToken?:          string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const customer = await db.subscriptionCustomer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // ── Vía 1: token de invitación válido y vigente apuntando a este customer ──
  let authorized = false;
  if (body.inviteToken) {
    const invite = await db.cardInvitation.findUnique({
      where:  { token: body.inviteToken },
      select: { customerId: true, expiresAt: true, usedAt: true },
    });
    if (
      invite &&
      invite.customerId === id &&
      invite.expiresAt > new Date() &&
      !invite.usedAt
    ) {
      authorized = true;
    }
  }

  // ── Vía 2: sesión autenticada del merchant propietario ────────────────────
  if (!authorized) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        const dbUser = await db.user.findUnique({
          where:  { supabaseId: sbUser.id },
          select: { id: true },
        });
        if (dbUser) {
          const owns = await db.connectedAccount.findFirst({
            where:  { id: customer.connectedAccountId, userId: dbUser.id },
            select: { id: true },
          });
          if (owns) authorized = true;
        }
      }
    } catch {
      // Sesión no válida → no autoriza
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await db.subscriptionCustomer.update({
      where: { id },
      data: {
        ...(body.stripePaymentMethodId !== undefined && { stripePaymentMethodId: body.stripePaymentMethodId }),
        ...(body.status !== undefined && { status: body.status as "ACTIVE" | "PENDING_CARD" | "FAILED" | "CANCELLED" }),
      },
    });
    return NextResponse.json({ ok: true, customer: updated });
  } catch (err) {
    console.error("[subscriptions/customers/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
