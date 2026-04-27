/**
 * POST /api/subscriptions/invite/batch
 *
 * Envía invitaciones de tarjeta a múltiples clientes en paralelo.
 * - DB invitations con createMany (una sola query)
 * - Emails en paralelo con Promise.allSettled en chunks de CONCURRENCY
 *
 * 100 emails: ~3-6 s en lugar de ~20 s en serie.
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";
import { sendCardInvitationEmail }   from "@/lib/email";
import { randomBytes }               from "crypto";

function cuid() { return randomBytes(16).toString("hex"); }

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

const EXPIRES_DAYS  = 7;
const CONCURRENCY   = 20; // Resend soporta ~10 req/s en Free, más en Pro

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, businessName: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  let body: { customerIds: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { customerIds } = body;
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json({ error: "customerIds array is required" }, { status: 400 });
  }

  // ── Una sola query para todos los clientes ───────────────────────────────────
  const customers = await db.subscriptionCustomer.findMany({
    where:  { id: { in: customerIds }, connectedAccountId: account.id },
    select: { id: true, name: true, email: true },
  });

  if (!customers.length) return NextResponse.json({ sent: 0, errors: 0, total: 0 });

  const expiresAt    = new Date(Date.now() + EXPIRES_DAYS * 86_400_000);
  const businessName = account.businessName || "PayForce";

  // ── Crear TODAS las invitaciones en una sola query ───────────────────────────
  const invitationData = customers.map(c => ({
    id:         cuid(),
    customerId: c.id,
    token:      cuid(),
    expiresAt,
  }));

  await db.cardInvitation.createMany({ data: invitationData });

  // Mapa customerId → token
  const tokenMap = new Map(invitationData.map(inv => [inv.customerId, inv.token]));

  // ── Enviar emails en chunks paralelos ────────────────────────────────────────
  let sent   = 0;
  let errors = 0;

  for (const batch of chunk(customers, CONCURRENCY)) {
    const results = await Promise.allSettled(
      batch.map(customer =>
        sendCardInvitationEmail({
          to:            customer.email,
          customerName:  customer.name,
          businessName,
          token:         tokenMap.get(customer.id)!,
          expiresInDays: EXPIRES_DAYS,
        })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else errors++;
    }
  }

  return NextResponse.json({ sent, errors, total: customers.length });
}
