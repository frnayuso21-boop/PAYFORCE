import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
if (!APP_URL) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL no está definida. Configúrala antes de desplegar.",
  );
}

/**
 * POST /api/connect/account-link
 *
 * Genera un AccountLink de Stripe para el onboarding Express del usuario.
 * Requiere que el usuario ya tenga una ConnectedAccount en BD
 * (creada previamente con POST /api/connect/account).
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    // Obtener el stripeAccountId de la cuenta del usuario
    let stripeAccountId: string | null = null;

    // Permitir pasar el accountId explícitamente (desde el UI de onboarding)
    let body: { accountId?: string } = {};
    try { body = await req.json(); } catch { /* sin body */ }

    if (body.accountId) {
      // Verificar que la cuenta pertenece al usuario
      const account = await db.connectedAccount.findFirst({
        where: { stripeAccountId: body.accountId, userId: user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Cuenta no encontrada o sin permisos" }, { status: 403 });
      }
      stripeAccountId = body.accountId;
    } else {
      // Usar la cuenta primaria del usuario
      const primary = await getUserPrimaryAccount(user.id);
      if (!primary) {
        return NextResponse.json(
          { error: "No tienes ninguna cuenta conectada. Crea una primero." },
          { status: 422 },
        );
      }
      stripeAccountId = primary.stripeAccountId;
    }

    // Generar el AccountLink de Stripe
    const accountLink = await stripe.accountLinks.create({
      account:     stripeAccountId,
      refresh_url: `${APP_URL}/app/connect/onboarding`,
      return_url:  `${APP_URL}/app/connect/status`,
      type:        "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[connect/account-link]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
