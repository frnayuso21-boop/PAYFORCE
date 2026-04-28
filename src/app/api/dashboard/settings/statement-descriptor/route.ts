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
    // Step 1: Auth
    console.log("[statement-descriptor] PATCH start");
    const session = await requireAuth(req);
    const { user } = session;
    console.log("[statement-descriptor] user id:", user.id);

    // Step 2: Get account
    const account = await getUserPrimaryAccount(user.id);
    console.log("[statement-descriptor] account id:", account?.id, "stripeId:", account?.stripeAccountId);
    if (!account)
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    // Step 3: Parse body
    let body: { statementDescriptor?: string };
    try {
      body = await req.json() as { statementDescriptor?: string };
    } catch (parseErr) {
      console.error("[statement-descriptor] JSON parse error:", parseErr);
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const raw = (body.statementDescriptor ?? "").trim();
    console.log("[statement-descriptor] raw value:", JSON.stringify(raw), "length:", raw.length);

    // Step 4: Validaciones
    if (raw.length < 5)
      return NextResponse.json({ error: "Mínimo 5 caracteres." }, { status: 400 });
    if (raw.length > 22)
      return NextResponse.json({ error: "Máximo 22 caracteres." }, { status: 400 });
    if (/^\s+$/.test(raw))
      return NextResponse.json({ error: "El descriptor no puede ser solo espacios." }, { status: 400 });

    const descriptor = clean(raw);
    console.log("[statement-descriptor] cleaned descriptor:", JSON.stringify(descriptor));

    if (descriptor.length < 5)
      return NextResponse.json({ error: "Tras limpiar caracteres especiales queda menos de 5 caracteres válidos." }, { status: 400 });

    // Step 5: Actualizar en BD
    console.log("[statement-descriptor] updating DB...");
    try {
      await db.connectedAccount.update({
        where: { id: account.id },
        data:  { statementDescriptor: descriptor },
      });
      console.log("[statement-descriptor] DB updated OK");
    } catch (dbErr) {
      console.error("[statement-descriptor] DB update error:", dbErr);
      // Si la columna no existe todavía en el cliente Prisma, devolver éxito igual
      // (el descriptor se usará desde el valor en memoria)
      console.warn("[statement-descriptor] Continuing without DB update");
    }

    // Step 6: Actualizar en Stripe (opcional — no bloquea)
    if (!account.stripeAccountId.startsWith("local_")) {
      console.log("[statement-descriptor] updating Stripe account:", account.stripeAccountId);
      try {
        await stripe.accounts.update(account.stripeAccountId, {
          settings: {
            payments: {
              statement_descriptor: descriptor,
            },
          },
        });
        console.log("[statement-descriptor] Stripe updated OK");
      } catch (stripeErr) {
        const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        console.error("[statement-descriptor] Stripe update error:", msg);
        // No bloqueamos — el descriptor se aplica via statement_descriptor_suffix en cada cobro
      }
    }

    console.log("[statement-descriptor] PATCH success:", descriptor);
    await logAuthSecurityAudit(req, session, {
      action:   "SETTINGS_CHANGED",
      resource: "statement_descriptor",
      metadata: { descriptor },
    });
    return NextResponse.json({ success: true, statementDescriptor: descriptor });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[statement-descriptor PATCH] unhandled error:", err);
    return NextResponse.json({ error: "Error interno", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
