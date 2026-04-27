/**
 * POST /api/subscriptions/setup
 * El merchant crea un cliente de suscripción (sin cobrar).
 * Devuelve customerId para luego enviar la invitación.
 */
import { NextRequest, NextResponse }  from "next/server";
import { stripe }                     from "@/lib/stripe";
import { db }                         from "@/lib/db";
import { createSupabaseServerClient }       from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, businessName: true, stripeAccountId: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  let body: {
    name:              string;
    email:             string;
    phone?:            string;
    externalReference?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, email, phone, externalReference } = body;
  if (!name?.trim())  return NextResponse.json({ error: "name is required" },  { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "email is required" }, { status: 400 });

  // Crear cliente en Stripe
  const stripeCustomer = await stripe.customers.create({
    name:  name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() ?? undefined,
    metadata: {
      connectedAccountId: account.id,
      externalReference:  externalReference ?? "",
    },
  });

  // Guardar en BD
  const customer = await db.subscriptionCustomer.create({
    data: {
      connectedAccountId:   account.id,
      stripeCustomerId:     stripeCustomer.id,
      name:                 name.trim(),
      email:                email.trim().toLowerCase(),
      phone:                phone?.trim() ?? null,
      externalReference:    externalReference?.trim() ?? null,
      status:               "PENDING_CARD",
    },
  });

  return NextResponse.json({ customerId: customer.id, stripeCustomerId: stripeCustomer.id }, { status: 201 });
}
