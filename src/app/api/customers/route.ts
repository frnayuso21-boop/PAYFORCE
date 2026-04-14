import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient }  from "@/lib/supabase/server";
import { db }                          from "@/lib/db";

async function getAccountIds(userId: string) {
  const accounts = await db.connectedAccount.findMany({
    where:  { userId },
    select: { id: true },
  });
  return accounts.map(a => a.id);
}

async function getDbUser(supabaseId: string) {
  return db.user.findUnique({ where: { supabaseId }, select: { id: true } });
}

// ─── GET /api/customers ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const accountIds = await getAccountIds(dbUser.id);

  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const page  = parseInt(searchParams.get("page") ?? "1");
  const skip  = (page - 1) * limit;

  const where = {
    connectedAccountId: { in: accountIds },
    ...(q ? {
      OR: [
        { name:        { contains: q, mode: "insensitive" as const } },
        { email:       { contains: q, mode: "insensitive" as const } },
        { companyName: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [data, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { totalSpend: "desc" },
      skip,
      take: limit,
    }),
    db.customer.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { total, page, limit } });
}

// ─── POST /api/customers ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const accountIds = await getAccountIds(dbUser.id);
  if (!accountIds.length) return NextResponse.json({ error: "No connected account" }, { status: 400 });

  const body = await req.json();

  // ── Validaciones básicas ──
  if (!body.name?.trim())  return NextResponse.json({ error: "El nombre es obligatorio" },  { status: 422 });
  if (!body.email?.trim()) return NextResponse.json({ error: "El email es obligatorio" },   { status: 422 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    return NextResponse.json({ error: "Email no válido" }, { status: 422 });

  const connectedAccountId = accountIds[0];

  // ── Upsert: si ya existe el email en esta cuenta, actualizar ──
  const existing = await db.customer.findUnique({
    where: { connectedAccountId_email: { connectedAccountId, email: body.email.trim().toLowerCase() } },
  });

  const payload = {
    name:              body.name.trim(),
    language:          body.language          ?? "es",
    description:       body.description       ?? null,
    companyName:       body.companyName        ?? null,
    contactName:       body.contactName        ?? null,
    billingEmail:      body.billingEmail?.trim() || null,
    billingCountry:    body.billingCountry     ?? null,
    phone:             body.phone              ?? null,
    phonePrefix:       body.phonePrefix        ?? null,
    currency:          body.currency           ?? "eur",
    timezone:          body.timezone           ?? "Europe/Madrid",
    taxStatus:         body.taxStatus          ?? null,
    taxId:             body.taxId              ?? null,
    taxIdType:         body.taxIdType          ?? null,
    taxIdCountry:      body.taxIdCountry       ?? null,
    shippingName:      body.shippingName       ?? null,
    shippingAddress:   body.shippingAddress    ?? null,
    shippingCity:      body.shippingCity       ?? null,
    shippingPostalCode:body.shippingPostalCode ?? null,
    shippingState:     body.shippingState      ?? null,
    shippingCountry:   body.shippingCountry    ?? null,
    invoiceTemplate:   body.invoiceTemplate    ?? "default",
  };

  let customer;
  if (existing) {
    customer = await db.customer.update({ where: { id: existing.id }, data: payload });
  } else {
    customer = await db.customer.create({
      data: {
        ...payload,
        email:             body.email.trim().toLowerCase(),
        connectedAccountId,
        stripeCustomerId:  null,
      },
    });
  }

  return NextResponse.json(customer, { status: existing ? 200 : 201 });
}
