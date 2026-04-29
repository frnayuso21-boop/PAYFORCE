import { NextRequest, NextResponse }              from "next/server";
import { stripe }                                  from "@/lib/stripe";
import { db }                                      from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";
import { logAuthSecurityAudit } from "@/lib/supabaseSecurityAudit";

export const dynamic = "force-dynamic";

function clean(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .substring(0, 22);
}

// ── GET: obtener el descriptor actual ────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const account  = await getUserPrimaryAccount(user.id);
    return NextResponse.json({
      statementDescriptor: account?.statementDescriptor ?? "",
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── PATCH: actualizar el descriptor ──────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { user } = session;

    const account = await getUserPrimaryAccount(user.id);
    if (!account)
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    let body: { statementDescriptor?: string };
    try {
      body = await req.json() as { statementDescriptor?: string };
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const raw = (body.statementDescriptor ?? "").trim();

    if (raw.length < 5)
      return NextResponse.json({ error: "Mínimo 5 caracteres." }, { status: 400 });
    if (raw.length > 22)
      return NextResponse.json({ error: "Máximo 22 caracteres." }, { status: 400 });
    if (/^\s+$/.test(raw))
      return NextResponse.json({ error: "El descriptor no puede ser solo espacios." }, { status: 400 });

    const descriptor = clean(raw);

    if (descriptor.length < 5)
      return NextResponse.json({ error: "Tras limpiar caracteres especiales queda menos de 5 caracteres válidos." }, { status: 400 });

    try {
      await db.connectedAccount.update({
        where: { id: account.id },
        data:  { statementDescriptor: descriptor },
      });
    } catch (dbErr) {
      console.error("[statement-descriptor] DB update error:", dbErr);
    }

    if (!account.stripeAccountId.startsWith("local_")) {
      try {
        await stripe.accounts.update(account.stripeAccountId, {
          settings: {
            payments: {
              statement_descriptor: descriptor,
            },
          },
        });
      } catch (stripeErr) {
        console.error("[statement-descriptor] Stripe update error:", stripeErr);
      }
    }

    await logAuthSecurityAudit(req, session, {
      action:   "SETTINGS_CHANGED",
      resource: "statement_descriptor",
      metadata: { descriptor },
    });
    return NextResponse.json({ success: true, statementDescriptor: descriptor });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[statement-descriptor PATCH]", err);
    return NextResponse.json({ error: "Error interno", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
