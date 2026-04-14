import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ settings: null });

    const settings = await db.invoiceSettings.findUnique({
      where: { connectedAccountId: ids[0] },
    });

    // Si no existe, devuelve defaults + nombre del negocio del ConnectedAccount
    if (!settings) {
      const account = await db.connectedAccount.findUnique({
        where: { id: ids[0] },
        select: { businessName: true, email: true, country: true },
      });
      return NextResponse.json({
        settings: {
          companyName:       account?.businessName ?? "",
          taxId:             "",
          address:           "",
          city:              "",
          postalCode:        "",
          country:           account?.country ?? "ES",
          phone:             "",
          website:           "",
          email:             account?.email ?? "",
          logoUrl:           null,
          accentColor:       "#6366f1",
          invoicePrefix:     "FAC",
          nextInvoiceNumber: 1,
          invoiceNotes:      "",
          paymentTerms:      "Pago inmediato",
          bankAccount:       "",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ error: "No account" }, { status: 400 });

    const body = await req.json();

    const allowed = [
      "companyName","taxId","address","city","postalCode","country",
      "phone","website","email","logoUrl","accentColor",
      "invoicePrefix","invoiceNotes","paymentTerms","bankAccount",
    ] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }

    const settings = await db.invoiceSettings.upsert({
      where:  { connectedAccountId: ids[0] },
      update: data,
      create: { connectedAccountId: ids[0], ...data },
    });

    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
