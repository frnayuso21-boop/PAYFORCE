/**
 * PATCH /api/subscriptions/customers/[id]
 * Actualiza stripePaymentMethodId y/o status del cliente.
 * Llamado por la página /pay/setup-card/[token] tras guardar la tarjeta.
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: {
    stripePaymentMethodId?: string;
    status?:               string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const customer = await db.subscriptionCustomer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const updated = await db.subscriptionCustomer.update({
    where: { id },
    data: {
      ...(body.stripePaymentMethodId !== undefined && { stripePaymentMethodId: body.stripePaymentMethodId }),
      ...(body.status !== undefined && { status: body.status as "ACTIVE" | "PENDING_CARD" | "FAILED" | "CANCELLED" }),
    },
  });

  return NextResponse.json({ ok: true, customer: updated });
}
