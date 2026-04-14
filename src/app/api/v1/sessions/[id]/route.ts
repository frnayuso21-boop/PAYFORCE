// @ts-nocheck
/**
 * GET /api/v1/sessions/[id]
 *
 * Obtiene el estado de una sesión de pago.
 * Autenticación: Authorization: Bearer pf_live_xxx (misma key que la creó)
 */

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { hashApiToken }              from "@/lib/api-key";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawToken = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!rawToken.startsWith("pf_live_")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  const keyHash = hashApiToken(rawToken);
  const apiKey  = await db.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || !apiKey.isActive) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const { id } = await params;

  const link = await db.paymentLink.findFirst({
    where: {
      id,
      apiKeyId:          apiKey.id,
      connectedAccountId: apiKey.connectedAccountId,
    },
    select: {
      id: true, token: true, amount: true, currency: true, status: true,
      description: true, customerEmail: true, customerName: true,
      successUrl: true, cancelUrl: true,
      expiresAt: true, createdAt: true, updatedAt: true,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({
    id:            link.id,
    status:        link.status,
    amount:        link.amount,
    currency:      link.currency,
    description:   link.description,
    customer_email: link.customerEmail,
    customer_name:  link.customerName,
    success_url:   link.successUrl,
    cancel_url:    link.cancelUrl,
    expires_at:    link.expiresAt,
    created_at:    link.createdAt,
    updated_at:    link.updatedAt,
  });
}
