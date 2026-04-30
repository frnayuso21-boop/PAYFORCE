import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

/**
 * GET /app/connect/dashboard-redirect
 *
 * FALLBACK DE EMERGENCIA — NO usar como flujo principal.
 *
 * Este endpoint solo existe como soporte técnico para cuentas Express existentes
 * que eventualmente puedan necesitar acceso temporal al dashboard de Stripe.
 *
 * El flujo principal de PayForce usa embedded components:
 * - Onboarding → /app/connect/onboarding (EmbeddedOnboarding)
 * - Pagos → /app/connect/payments (EmbeddedPayments)
 * - Balance → /app/connect/payouts (EmbeddedPayouts)
 * - Disputas → /app/connect/disputes (EmbeddedDisputes)
 * - Gestión → /app/connect (EmbeddedNotificationBanner)
 *
 * Este endpoint NO está enlazado desde ningún punto de la UI de PayForce.
 * Solo se mantiene para soporte interno y casos edge con cuentas Express antiguas.
 */
export async function GET(req: NextRequest) {
 try {
 const { user } = await requireAuth(req);

 const account = await getUserPrimaryAccount(user.id);

 if (!account) {
 return NextResponse.redirect(new URL("/app/connect/onboarding", req.url));
 }

 if (!account.detailsSubmitted) {
 return NextResponse.redirect(new URL("/app/connect/onboarding", req.url));
 }

 // Solo disponible para cuentas Express (tipo legacy)
 // Las cuentas nuevas con controller.stripe_dashboard.type: "none"// no tienen login link — se gestionan 100% via embedded components
 try {
 const loginLink = await stripe.accounts.createLoginLink(account.stripeAccountId);
 return NextResponse.redirect(loginLink.url);
 } catch {
 // Las cuentas nuevas (controller properties) devuelven error al intentar crear login link
 // En ese caso redirigir al panel interno
 return NextResponse.redirect(new URL("/app/connect", req.url));
 }

 } catch (err) {
 if (err instanceof AuthError) {
 return NextResponse.redirect(new URL("/login", req.url));
 }
 console.error("[connect/dashboard-redirect]", err);
 return NextResponse.redirect(new URL("/app/connect", req.url));
 }
}
