import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/payouts/add-debit-card
 *
 * Vincula una tarjeta de débito como external account para instant payouts.
 * Flujo:
 *  1. Asegurar que la cuenta Custom tiene las capabilities necesarias.
 *  2. Crear el external account desde la PLATAFORMA (no desde la cuenta conectada).
 *  3. Verificar que es débito; si no, eliminarla y devolver error.
 *  4. Persistir en BD.
 *
 * El token DEBE crearse en el frontend con stripe.createToken(cardElement)
 * usando la clave pública de la PLATAFORMA (sin stripeAccount).
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { tokenId } = await req.json() as { tokenId: string };

    if (!tokenId || !tokenId.startsWith("tok_")) {
      return NextResponse.json({ error: "Token de tarjeta inválido" }, { status: 400 });
    }

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account?.stripeAccountId) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    if (account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json({ error: "Cuenta en modo test — no se pueden añadir tarjetas reales" }, { status: 400 });
    }

    // ── 1. Asegurar capabilities (card_payments + transfers) ─────────────────
    // En cuentas Custom estas capabilities deben estar solicitadas explícitamente.
    // Si ya están activas, Stripe ignora la petición (idempotente).
    try {
      await stripe.accounts.update(account.stripeAccountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
      });
    } catch (capErr) {
      // No bloqueamos si ya están activas o si el tipo de cuenta no las soporta
      const capMsg = capErr instanceof Error ? capErr.message : "";
      if (!capMsg.includes("already") && !capMsg.includes("active")) {
        console.error("[add-debit-card] capability update warning:", capMsg);
      }
    }

    // ── 2. Crear external account desde la PLATAFORMA ────────────────────────
    // stripe.accounts.createExternalAccount() con la clave de plataforma
    // es el único método que funciona en cuentas Custom sin que la cuenta
    // conectada necesite permisos propios.
    const externalAccount = await stripe.accounts.createExternalAccount(
      account.stripeAccountId,
      {
        external_account:     tokenId,
        default_for_currency: false, // No reemplazar el IBAN como cuenta por defecto
      },
    );

    // ── 3. Verificar que es tarjeta de débito ────────────────────────────────
    const card = externalAccount as {
      id: string; object: string; funding?: string;
      brand: string; last4: string; exp_month: number; exp_year: number;
    };

    if (card.funding !== "debit") {
      await stripe.accounts.deleteExternalAccount(account.stripeAccountId, card.id).catch(() => null);
      return NextResponse.json(
        { error: "Solo se aceptan tarjetas de débito para instant payouts. Las tarjetas de crédito no son válidas." },
        { status: 400 },
      );
    }

    // ── 4. Persistir en BD ───────────────────────────────────────────────────
    await db.connectedAccount.update({
      where: { id: account.id },
      data:  {
        instantPayoutsEnabled: true,
        debitCardLast4:        card.last4,
        debitCardBrand:        card.brand,
      },
    });

    return NextResponse.json({
      success: true,
      card: {
        id:       card.id,
        brand:    card.brand,
        last4:    card.last4,
        expMonth: card.exp_month,
        expYear:  card.exp_year,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });

    // Mejorar mensajes de error de Stripe para el usuario final
    const raw = err instanceof Error ? err.message : "Error interno";
    let userMsg = raw;

    if (raw.includes("does not have the required permissions") || raw.includes("capabilities")) {
      userMsg = "Tu cuenta aún no tiene activados los pagos con tarjeta. Completa el onboarding en Ajustes → Cuenta bancaria.";
    } else if (raw.includes("No such token")) {
      userMsg = "El token de tarjeta ha expirado. Vuelve a introducir los datos de tu tarjeta.";
    } else if (raw.includes("external_account")) {
      userMsg = "No se pudo añadir la tarjeta. Asegúrate de que es una tarjeta de débito Visa/Mastercard válida.";
    }

    console.error("[add-debit-card]", err);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
