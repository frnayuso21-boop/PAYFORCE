import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/store/[slug]
 *
 * Endpoint PÚBLICO — devuelve los datos de la tienda de un comerciante.
 * Solo expone campos públicos (sin email completo, sin stripeAccountId).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`store-public:${ip}`, { windowMs: 60_000, max: 120 });
  if (!rl.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  try {
    const { slug } = await params;

    if (!slug || slug.length < 2 || slug.length > 64) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }

    const account = await db.connectedAccount.findUnique({
      where:  { slug: slug.toLowerCase() },
      select: {
        id:               true,
        businessName:     true,
        country:          true,
        defaultCurrency:  true,
        storeDescription: true,
        primaryColor:     true,
        storeEnabled:     true,
        slug:             true,
        chargesEnabled:   true,
        // Solo el dominio del email (privacidad)
        email:            true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    if (!account.storeEnabled) {
      return NextResponse.json({ error: "Esta tienda no está activa" }, { status: 403 });
    }

    return NextResponse.json({
      slug:         account.slug,
      businessName: account.businessName || "Mi Tienda",
      country:      account.country,
      currency:     account.defaultCurrency,
      description:  account.storeDescription ?? "",
      primaryColor: account.primaryColor ?? "#0f172a",
      // Email enmascarado para no exponer datos personales
      emailDomain:  account.email ? account.email.split("@")[1] ?? "" : "",
      chargesEnabled: account.chargesEnabled,
    });
  } catch (err) {
    console.error("[store GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
