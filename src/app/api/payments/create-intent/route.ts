import { NextResponse } from "next/server";

/**
 * Este endpoint fue eliminado.
 *
 * El flujo MOR (Merchant of Record con transfers manuales) ha sido
 * reemplazado por Destination Charges con application_fee_amount.
 * Usa POST /api/payment-links para crear pagos.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:   "Endpoint eliminado. Usa POST /api/payment-links.",
      details: "El flujo MOR ha sido reemplazado por Destination Charges.",
    },
    { status: 410 },
  );
}
