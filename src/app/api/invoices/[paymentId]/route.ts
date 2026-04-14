import { NextRequest, NextResponse } from "next/server";
import { renderToStream }            from "@react-pdf/renderer";
import { createElement }             from "react";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";
import { InvoiceDocument }           from "@/lib/invoice-pdf";
import type { InvoiceData }          from "@/lib/invoice-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  let userEmail: string;
  try {
    const { user } = await requireAuth(req);
    userEmail = user.email;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;

  const payment = await db.payment.findFirst({
    where: { id: paymentId },
    include: {
      connectedAccount: {
        include: {
          user:            true,
          invoiceSettings: true,
        },
      },
      customer: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  const ownerEmail = payment.connectedAccount?.user?.email ?? payment.connectedAccount?.email;
  if (ownerEmail !== userEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cfg = payment.connectedAccount?.invoiceSettings;
  const acc = payment.connectedAccount;

  // Número de factura: si tiene settings usamos prefix + número incremental
  const prefix = cfg?.invoicePrefix ?? "PF";
  const num    = cfg?.nextInvoiceNumber ?? 1;
  const year   = payment.createdAt.getFullYear();
  const month  = String(payment.createdAt.getMonth() + 1).padStart(2, "0");
  const invoiceNumber = `${prefix}-${year}-${month}-${String(num).padStart(4, "0")}`;

  const data: InvoiceData = {
    invoiceNumber,
    invoiceDate:     payment.createdAt.toISOString(),
    status:          payment.status,
    // Merchant: primero usa settings personalizados, luego ConnectedAccount
    merchantName:    cfg?.companyName   || acc?.businessName || "Merchant",
    merchantEmail:   cfg?.email         || acc?.email        || ownerEmail || "",
    merchantCountry: cfg?.country       || acc?.country      || "ES",
    merchantTaxId:   cfg?.taxId         || "",
    merchantAddress: cfg?.address       || "",
    merchantCity:    cfg?.city          || "",
    merchantPostal:  cfg?.postalCode    || "",
    merchantPhone:   cfg?.phone         || "",
    merchantWebsite: cfg?.website       || "",
    merchantLogoUrl: cfg?.logoUrl       || null,
    accentColor:     cfg?.accentColor   || "#6366f1",
    invoiceNotes:    cfg?.invoiceNotes  || "",
    paymentTerms:    cfg?.paymentTerms  || "Pago inmediato",
    bankAccount:     cfg?.bankAccount   || "",
    // Cliente
    customerName:    payment.customerName ?? payment.customer?.name,
    customerEmail:   payment.customerEmail ?? payment.customer?.email,
    // Pago
    paymentId:       payment.id,
    stripeId:        payment.stripePaymentIntentId,
    description:     payment.description ?? undefined,
    amount:          payment.amount,
    currency:        payment.currency,
    applicationFee:  payment.applicationFeeAmount,
    netAmount:       payment.netAmount,
    createdAt:       (payment.stripeCreatedAt ?? payment.createdAt).toISOString(),
  };

  // Incrementa el contador (fire-and-forget)
  if (cfg) {
    db.invoiceSettings.update({
      where: { id: cfg.id },
      data:  { nextInvoiceNumber: { increment: 1 } },
    }).catch(() => {});
  }

  const doc    = createElement(InvoiceDocument, { d: data });
  const stream = await renderToStream(doc);
  const filename = `factura-${invoiceNumber}.pdf`;

  // @ts-expect-error renderToStream returns a Node.js readable stream
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data",  (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end",   () => controller.close());
      stream.on("error", (err: Error)  => controller.error(err));
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
