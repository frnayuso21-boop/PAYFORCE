import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * GET /.well-known/apple-developer-merchantid-domain-association
 *
 * Apple Pay exige que este fichero exista en el dominio antes de aceptar pagos.
 * Stripe proporciona el mismo fichero para todos sus merchants.
 *
 * En producción: este endpoint se llama automáticamente cuando Stripe verifica
 * tu dominio desde el Dashboard → Settings → Payment methods → Apple Pay.
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association",
      { next: { revalidate: 86400 } }, // revalidar cada 24h
    );

    if (!res.ok) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = await res.text();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Error fetching domain association file", { status: 502 });
  }
}
