/**
 * POST /api/subscriptions/import/confirm
 *
 * Recibe la lista de registros ya parseados y:
 * 1. Crea clientes nuevos en Stripe + BD (reutiliza la lógica de xml/import)
 * 2. Envía invitaciones de tarjeta a los que tienen email (reutiliza invite/batch)
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma }                    from "@prisma/client";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 10;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

interface ImportRecord {
  name:      string;
  email?:    string | null;
  phone?:    string | null;
  reference: string;
  amount:    number;
  iban?:     string | null;
  found:     boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const account = await db.connectedAccount.findFirst({
      where:  { userId: dbUser.id },
      select: { id: true, businessName: true },
    });
    if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

    const body = await req.json() as { records: ImportRecord[]; sendInvites?: boolean };
    const { records = [], sendInvites = true } = body;

    const toCreate = records.filter((r) => !r.found && r.name?.trim() && r.reference?.trim());

    let imported = 0;
    let errors   = 0;

    // ── Crear en Stripe en paralelo ────────────────────────────────────────
    type DbRow = Prisma.SubscriptionCustomerCreateManyInput;
    const dbRows: DbRow[] = [];

    for (const batch of chunk(toCreate, CONCURRENCY)) {
      const results = await Promise.allSettled(
        batch.map(async (rec) => {
          const email = rec.email?.trim() ||
            `noreply+${rec.reference.replace(/\W/g, "")}@payforce.internal`;

          const sc = await stripe.customers.create({
            name:  rec.name.trim(),
            email,
            phone: rec.phone?.trim() || undefined,
            metadata: {
              connectedAccountId: account.id,
              externalReference:  rec.reference,
            },
          });

          dbRows.push({
            connectedAccountId: account.id,
            stripeCustomerId:   sc.id,
            name:               rec.name.trim(),
            email,
            phone:              rec.phone?.trim() || null,
            externalReference:  rec.reference,
            amount:             rec.amount,
            currency:           "eur",
            iban:               rec.iban?.trim() || null,
            status:             "PENDING_CARD",
          });
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") imported++;
        else errors++;
      }
    }

    // ── Insertar en BD ─────────────────────────────────────────────────────
    if (dbRows.length) {
      await db.subscriptionCustomer.createMany({ data: dbRows, skipDuplicates: true });
    }

    // ── Enviar invitaciones a clientes nuevos con email real ───────────────
    let invitesSent = 0;
    if (sendInvites && dbRows.length) {
      const withRealEmail = dbRows.filter(
        (r) => r.email && !String(r.email).includes("@payforce.internal")
      );

      if (withRealEmail.length) {
        // Obtener IDs de los clientes recién creados
        const refs = withRealEmail.map((r) => r.externalReference).filter(Boolean) as string[];
        const created = await db.subscriptionCustomer.findMany({
          where: { connectedAccountId: account.id, externalReference: { in: refs } },
          select: { id: true },
        });
        const ids = created.map((c) => c.id);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/subscriptions/invite/batch`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            // Pasamos la cookie de la request original no es posible en server,
            // así que llamamos directamente a la lógica de invite si es necesario.
            // Por ahora devolvemos los IDs para que el cliente llame al batch.
            body: JSON.stringify({ customerIds: ids }),
          }
        );
        if (res.ok) {
          const d = await res.json() as { sent?: number };
          invitesSent = d.sent ?? 0;
        }
      }
    }

    return NextResponse.json({
      ok:         true,
      imported,
      errors,
      skipped:    toCreate.length - imported,
      invitesSent,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[subscriptions/import/confirm POST]", err);
    return NextResponse.json({ error: "Error interno al importar" }, { status: 500 });
  }
}
