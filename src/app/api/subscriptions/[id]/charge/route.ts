import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/subscriptions/[id]/charge
// Añade un cargo de importe libre a la PRÓXIMA factura de la suscripción.
// Ideal para energía, servicios con precio variable, consumos mensuales, etc.
// El importe aparece en el extracto bancario con el descriptor configurado.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user }         = await requireAuth(req);
    const { id: subId }    = await params;

    const body = await req.json() as {
      amount:       number;    // céntimos — ej: 8743 = 87,43€
      description:  string;    // aparece en la línea de factura
      period?: {
        start: number;         // unix timestamp inicio período
        end:   number;         // unix timestamp fin período
      };
    };

    const { amount, description, period } = body;

    if (!Number.isInteger(amount) || amount < 1)
      return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    if (!description)
      return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });

    // Verificar que la suscripción pertenece al merchant
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["customer"] });
    if (sub.metadata?.merchantUserId !== user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    if (sub.status === "canceled")
      return NextResponse.json({ error: "La suscripción está cancelada" }, { status: 400 });

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    // Crear Invoice Item — se añade automáticamente a la próxima factura
    const invoiceItem = await stripe.invoiceItems.create({
      customer:      customerId,
      subscription:  subId,
      amount,
      currency:      "eur",
      description,
      // Período de consumo (opcional, aparece en la factura)
      ...(period ? { period } : {}),
      metadata: {
        merchantUserId: user.id,
        source:         "variable-charge",
      },
    });

    return NextResponse.json({
      ok:            true,
      invoiceItemId: invoiceItem.id,
      amount:        invoiceItem.amount,
      description:   invoiceItem.description,
      message:       `Cargo de €${(amount / 100).toFixed(2)} añadido a la próxima factura`,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[subscriptions charge POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
