/**
 * POST /api/subscriptions/invite
 * Crea una invitación y envía email al cliente para guardar su tarjeta.
 *
 * Body: { customerId }
 */
import { NextRequest, NextResponse }   from "next/server";
import { db }                          from "@/lib/db";
import { createSupabaseServerClient }        from "@/lib/supabase/server";
import { sendCardInvitationEmail }     from "@/lib/email";

export const dynamic = "force-dynamic";

const EXPIRES_DAYS = 7;

export async function POST(req: NextRequest) {
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

  let body: { customerId: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { customerId } = body;
  if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });

  const customer = await db.subscriptionCustomer.findFirst({
    where: { id: customerId, connectedAccountId: account.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 86_400_000);

  const invitation = await db.cardInvitation.create({
    data: { customerId: customer.id, expiresAt },
  });

  // Enviar email — no bloqueamos la respuesta si falla
  let emailSent = false;
  try {
    await sendCardInvitationEmail({
      to:           customer.email,
      customerName: customer.name,
      businessName: account.businessName || "PayForce",
      token:        invitation.token,
      expiresInDays: EXPIRES_DAYS,
    });
    emailSent = true;
  } catch (e) {
    console.error("[invite] email failed:", e);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    invitationId: invitation.id,
    token:        invitation.token,
    setupUrl:     `${baseUrl}/setup-card/${invitation.token}`,
    expiresAt:    invitation.expiresAt,
    emailSent,
  }, { status: 201 });
}
