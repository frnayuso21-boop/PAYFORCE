import { NextResponse } from "next/server";

/**
 * Este endpoint fue eliminado.
 *
 * Con Destination Charges, Stripe transfiere el neto al connected account
 * de forma automática en el momento del pago. No se requieren transferencias
 * manuales ni liquidaciones separadas.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:   "Endpoint eliminado.",
      details: "Con Destination Charges las liquidaciones son automáticas vía Stripe.",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error:   "Endpoint eliminado.",
      details: "Con Destination Charges las liquidaciones son automáticas vía Stripe.",
    },
    { status: 410 },
  );
}
