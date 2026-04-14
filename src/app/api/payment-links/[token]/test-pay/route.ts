import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment-links/[token]/test-pay
 *
 * Endpoint PÚBLICO (sin auth) para simular un pago completado en modo test.
 * Solo funciona si el link tiene stripePaymentIntentId que empieza por "pi_test_".
 * El cliente lo llama al pulsar "Simular pago" en la pantalla /pay/[token].
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const link = await db.paymentLink.findUnique({
      where:  { token },
      select: { id: true, status: true, stripePaymentIntentId: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });
    }

    // Solo permitido en links de prueba
    if (!link.stripePaymentIntentId?.startsWith("pi_test_")) {
      return NextResponse.json(
        { error: "Este enlace no es de prueba" },
        { status: 422 },
      );
    }

    if (link.status !== "open") {
      return NextResponse.json(
        { error: `El enlace ya está en estado '${link.status}'` },
        { status: 422 },
      );
    }

    await db.paymentLink.update({
      where: { id: link.id },
      data:  { status: "paid", usedCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (err) {
    console.error("[test-pay POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
