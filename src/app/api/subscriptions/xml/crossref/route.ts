/**
 * POST /api/subscriptions/xml/crossref
 *
 * Recibe un array de referencias externas y devuelve un mapa con
 * el estado de cada cliente en la BD del merchant autenticado.
 * Endpoint ligero: solo IDs — no recibe el XML completo.
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { createSupabaseServerClient }      from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where:  { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  let body: { references: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const refs = body.references ?? [];
  if (!refs.length) return NextResponse.json({ map: {} });

  // Una sola query — solo los campos necesarios
  const customers = await db.subscriptionCustomer.findMany({
    where: {
      connectedAccountId: account.id,
      externalReference:  { in: refs },
    },
    select: {
      id:                   true,
      externalReference:    true,
      stripePaymentMethodId: true,
      status:               true,
    },
  });

  // Construir mapa referencia → datos
  const map: Record<string, {
    customerId: string;
    hasCard:    boolean;
    status:     string;
  }> = {};

  for (const c of customers) {
    if (c.externalReference) {
      map[c.externalReference] = {
        customerId: c.id,
        hasCard:    !!c.stripePaymentMethodId,
        status:     c.status,
      };
    }
  }

  return NextResponse.json({ map });
}
