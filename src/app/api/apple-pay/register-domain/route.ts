import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

/**
 * POST /api/apple-pay/register-domain
 *
 * Registra el dominio de la app en Stripe para Apple Pay.
 * Solo necesitas llamarlo UNA vez por dominio (local, staging, producción).
 *
 * Ejemplo: fetch("/api/apple-pay/register-domain", { method: "POST" })
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const domain = process.env.NEXT_PUBLIC_APP_URL
      ?.replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!domain) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL no definida." },
        { status: 400 },
      );
    }

    // Verificar si ya está registrado para evitar duplicados
    const existing = await stripe.applePayDomains.list({ limit: 100 });
    const alreadyRegistered = existing.data.some((d) => d.domain_name === domain);

    if (alreadyRegistered) {
      return NextResponse.json({ ok: true, domain, already: true });
    }

    await stripe.applePayDomains.create({ domain_name: domain });

    return NextResponse.json({ ok: true, domain, registered: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[apple-pay/register-domain]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
