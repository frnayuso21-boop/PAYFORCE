import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";
import { resolveConnectStatus, formatRequirements } from "@/lib/connect";

export const dynamic = "force-dynamic";

/**
 * GET /api/connect/status
 *
 * Devuelve el estado actualizado de la cuenta Connect del usuario.
 * Consulta Stripe en tiempo real y sincroniza con la BD.
 *
 * Respuesta:
 *   {
 *     status: "NOT_CONNECTED" | "PENDING" | "RESTRICTED" | "ENABLED" | "REJECTED"
 *     chargesEnabled: boolean
 *     payoutsEnabled: boolean
 *     detailsSubmitted: boolean
 *     requirements: string[]       ← pendientes legibles
 *     requiresAction: boolean      ← true si hay requisitos bloqueantes
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    if (!account) {
      return NextResponse.json({ status: "NOT_CONNECTED", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, requirements: [], requiresAction: false });
    }

    // Consultar Stripe para datos frescos
    try {
      const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId);
      const freshStatus   = resolveConnectStatus(stripeAccount);
      const requirements  = formatRequirements(stripeAccount.requirements?.currently_due ?? []);
      const requiresAction = requirements.length > 0 || freshStatus === "PENDING";

      // Sincronizar BD si algo cambió
      const changed =
        account.status           !== freshStatus ||
        account.chargesEnabled   !== (stripeAccount.charges_enabled ?? false) ||
        account.payoutsEnabled   !== (stripeAccount.payouts_enabled ?? false) ||
        account.detailsSubmitted !== (stripeAccount.details_submitted ?? false);

      if (changed) {
        await db.connectedAccount.update({
          where: { id: account.id },
          data: {
            status:           freshStatus,
            chargesEnabled:   stripeAccount.charges_enabled ?? false,
            payoutsEnabled:   stripeAccount.payouts_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
          },
        });
      }

      return NextResponse.json({
        status:           freshStatus,
        chargesEnabled:   stripeAccount.charges_enabled ?? false,
        payoutsEnabled:   stripeAccount.payouts_enabled ?? false,
        detailsSubmitted: stripeAccount.details_submitted ?? false,
        requirements,
        requiresAction,
      });
    } catch {
      // Si Stripe no está disponible, devolver datos de BD
      return NextResponse.json({
        status:           account.status,
        chargesEnabled:   account.chargesEnabled,
        payoutsEnabled:   account.payoutsEnabled,
        detailsSubmitted: account.detailsSubmitted,
        requirements:     [],
        requiresAction:   account.status !== "ENABLED",
      });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
