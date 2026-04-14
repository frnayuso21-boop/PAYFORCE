import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

/**
 * POST /api/connect/account-session
 *
 * Genera un Account Session de Stripe Connect para el merchant autenticado.
 * Permite inicializar cualquier embedded component (onboarding, payments,
 * payouts, balances, disputes, notification banner, account management).
 *
 * NO se almacena en BD — se regenera on-demand cada vez que se necesita
 * montar un componente embebido. Caduca en ~1 hora.
 *
 * Respuesta: { client_secret: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    // Permitir pasar accountId explícito (opcional)
    let stripeAccountId: string | null = null;

    let body: { accountId?: string } = {};
    try { body = await req.json(); } catch { /* sin body */ }

    if (body.accountId) {
      const account = await db.connectedAccount.findFirst({
        where: { stripeAccountId: body.accountId, userId: user.id },
      });
      if (!account) {
        return NextResponse.json(
          { error: "Cuenta no encontrada o sin permisos" },
          { status: 403 },
        );
      }
      stripeAccountId = body.accountId;
    } else {
      const primary = await getUserPrimaryAccount(user.id);
      if (!primary) {
        return NextResponse.json(
          { error: "No tienes ninguna cuenta activa. Completa el onboarding primero." },
          { status: 422 },
        );
      }
      stripeAccountId = primary.stripeAccountId;
    }

    // Cuentas placeholder local_ no tienen Account Session en Stripe
    if (!stripeAccountId || stripeAccountId.startsWith("local_")) {
      return NextResponse.json(
        { error: "La cuenta aún no está registrada en Stripe. Completa el onboarding." },
        { status: 422 },
      );
    }

    // Crear Account Session con los componentes imprescindibles.
    // Usamos solo los que funcionan de forma garantizada con cuentas
    // controller.stripe_dashboard.type = "none".
    const session = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: {
          enabled:  true,
          features: { external_account_collection: true },
        },
        account_management: {
          enabled:  true,
          features: { external_account_collection: true },
        },
        notification_banner: {
          enabled:  true,
          features: { external_account_collection: true },
        },
        payments: {
          enabled:  true,
          features: {
            refund_management:  true,
            dispute_management: true,
            capture_payments:   true,
          },
        },
        payouts: {
          enabled:  true,
          features: {
            instant_payouts:             true,
            standard_payouts:            true,
            edit_payout_schedule:        true,
            external_account_collection: true,
          },
        },
        balances: {
          enabled:  true,
          features: {
            instant_payouts:      true,
            standard_payouts:     true,
            edit_payout_schedule: true,
          },
        },
      },
    });

    return NextResponse.json({ client_secret: session.client_secret });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    // Mostrar el mensaje real de Stripe (no el genérico) para facilitar el debug
    const stripeMsg = (err as { message?: string })?.message ?? "";
    console.error("[connect/account-session]", stripeMsg, err);

    // Mensajes amigables para los errores más comunes
    if (stripeMsg.includes("No such account")) {
      return NextResponse.json(
        { error: "La cuenta de Stripe no existe. Por favor, vuelve a iniciar el proceso de activación." },
        { status: 422 },
      );
    }
    if (stripeMsg.includes("auth") || stripeMsg.includes("API key")) {
      return NextResponse.json(
        { error: "Error de autenticación con Stripe. Contacta con soporte." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: stripeMsg || "Error al conectar con Stripe. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
