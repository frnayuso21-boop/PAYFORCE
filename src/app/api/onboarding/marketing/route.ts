/**
 * POST /api/onboarding/marketing
 *
 * Hook para añadir al usuario a la lista de email marketing.
 * Actualmente es un mock — sustituir por la integración real
 * (Brevo, Mailchimp, Customer.io, etc.) cuando esté disponible.
 *
 * Solo se añade si marketingOptIn = true en el registro del usuario.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;

    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true, marketingOptIn: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Solo procesar si el usuario dio su consentimiento
    if (!user.marketingOptIn) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no_consent" });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TODO: Integración real de email marketing
    //
    // Ejemplos:
    //   Brevo (ex-Sendinblue):
    //     await fetch("https://api.brevo.com/v3/contacts", {
    //       method: "POST",
    //       headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json" },
    //       body: JSON.stringify({ email: user.email, attributes: { FIRSTNAME: user.name } }),
    //     });
    //
    //   Mailchimp:
    //     await mailchimp.lists.addListMember(LIST_ID, {
    //       email_address: user.email,
    //       status: "subscribed",
    //       merge_fields: { FNAME: user.name },
    //     });
    //
    //   Customer.io:
    //     await cio.identify(userId, { email: user.email, created_at: Date.now() / 1000 });
    // ──────────────────────────────────────────────────────────────────────────

    console.log(`[marketing] Añadir a lista: ${user.email} (mock)`);

    return NextResponse.json({ ok: true, subscribed: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // No bloqueamos el flujo por errores de marketing
    console.error("[onboarding/marketing]", err);
    return NextResponse.json({ ok: true, error: "marketing_failed" });
  }
}
