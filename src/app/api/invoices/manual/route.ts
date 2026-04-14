import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ invoices: [] });

    const invoices = await db.manualInvoice.findMany({
      where:   { connectedAccountId: { in: ids } },
      include: { lines: { orderBy: { position: "asc" } } },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    if (!ids.length) return NextResponse.json({ error: "No account" }, { status: 400 });

    const body = await req.json();
    const {
      clientName, clientEmail, clientAddress, clientTaxId,
      issueDate, dueDate, notes, paymentTerms, bankAccount,
      currency = "eur", discount = 0, lines = [],
    } = body;

    if (!clientName) return NextResponse.json({ error: "clientName es obligatorio" }, { status: 422 });
    if (!lines.length) return NextResponse.json({ error: "Añade al menos una línea" }, { status: 422 });

    // Calcula totales
    let subtotal = 0;
    let taxAmount = 0;
    const processedLines = (lines as Array<{
      description: string; quantity: number; unitPrice: number; taxRate?: number; productId?: string; position?: number;
    }>).map((l, i) => {
      const qty   = Number(l.quantity) || 1;
      const price = Math.round(Number(l.unitPrice)) || 0;
      const tax   = Number(l.taxRate) || 0;
      const lineTotal = Math.round(qty * price);
      subtotal  += lineTotal;
      taxAmount += Math.round(lineTotal * tax / 100);
      return {
        description: l.description,
        quantity:    qty,
        unitPrice:   price,
        taxRate:     tax,
        total:       lineTotal,
        position:    l.position ?? i,
        productId:   l.productId ?? undefined,
      };
    });

    const discountCents = Math.round(Number(discount)) || 0;
    const total = subtotal - discountCents + taxAmount;

    // Número de factura: MAN-2025-04-XXXX
    const now    = new Date();
    const prefix = `MAN-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const count  = await db.manualInvoice.count({ where: { connectedAccountId: ids[0] } });
    const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await db.manualInvoice.create({
      data: {
        connectedAccountId: ids[0],
        invoiceNumber,
        status:       "DRAFT",
        clientName:   String(clientName),
        clientEmail:  clientEmail   ? String(clientEmail)  : undefined,
        clientAddress:clientAddress ? String(clientAddress): undefined,
        clientTaxId:  clientTaxId   ? String(clientTaxId)  : undefined,
        issueDate:    issueDate ? new Date(issueDate) : new Date(),
        dueDate:      dueDate   ? new Date(dueDate)   : undefined,
        notes:        notes        ? String(notes)        : undefined,
        paymentTerms: paymentTerms ? String(paymentTerms) : "Pago inmediato",
        bankAccount:  bankAccount  ? String(bankAccount)  : undefined,
        currency:     String(currency).toLowerCase(),
        subtotal,
        discount:     discountCents,
        taxAmount,
        total,
        lines: { create: processedLines },
      },
      include: { lines: { orderBy: { position: "asc" } } },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
