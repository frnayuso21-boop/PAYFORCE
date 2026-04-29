/**
 * GET /api/invoices/[paymentId]/pdf
 *
 * Endpoint PÚBLICO para que el cliente descargue su factura/recibo
 * tras completar el checkout en /pay/[token].
 * Solo funciona para pagos con status SUCCEEDED.
 * Reutiliza la plantilla InvoiceDocument de @/lib/invoice-pdf.
 */
import { NextRequest, NextResponse } from "next/server";
import { renderToStream }            from "@react-pdf/renderer";
import { createElement }             from "react";
import { db }                        from "@/lib/db";
import { InvoiceDocument }           from "@/lib/invoice-pdf";
import type { InvoiceData }          from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;

  const payment = await db.payment.findUnique({
    where:   { id: paymentId },
    include: {
      connectedAccount: {
        include: { invoiceSettings: true },
      },
    },
  });

  if (!payment || payment.status !== "SUCCEEDED") {
    return NextResponse.json({ error: "Pago no encontrado o no completado" }, { status: 404 });
  }

  const acc = payment.connectedAccount;
  const cfg = acc?.invoiceSettings;

  // Número de factura: usa la numeración de InvoiceSettings si existe, si no genera uno por defecto
  const prefix = cfg?.invoicePrefix ?? "PF";
  const num    = cfg?.nextInvoiceNumber ?? 1;
  const year   = (payment.stripeCreatedAt ?? payment.createdAt).getFullYear();
  const invoiceNumber = `${prefix}-${year}-${String(num).padStart(4, "0")}`;

  const data: InvoiceData = {
    invoiceNumber,
    invoiceDate:     (payment.stripeCreatedAt ?? payment.createdAt).toISOString(),
    status:          payment.status,
    merchantName:    cfg?.companyName   || acc?.businessName || "PayForce",
    merchantEmail:   cfg?.email         || acc?.email        || "",
    merchantCountry: cfg?.country       || acc?.country      || "ES",
    merchantTaxId:   cfg?.taxId         || undefined,
    merchantAddress: cfg?.address       || undefined,
    merchantCity:    cfg?.city          || undefined,
    merchantPostal:  cfg?.postalCode    || undefined,
    merchantPhone:   cfg?.phone         || undefined,
    merchantWebsite: cfg?.website       || undefined,
    merchantLogoUrl: cfg?.logoUrl       || acc?.logoUrl      || null,
    accentColor:     cfg?.accentColor   || acc?.primaryColor || "#6366f1",
    invoiceNotes:    cfg?.invoiceNotes  || undefined,
    paymentTerms:    cfg?.paymentTerms  || "Pago inmediato",
    bankAccount:     cfg?.bankAccount   || undefined,
    customerName:    payment.customerName  ?? undefined,
    customerEmail:   payment.customerEmail ?? undefined,
    paymentId:       payment.id,
    stripeId:        payment.stripePaymentIntentId,
    description:     payment.description ?? undefined,
    amount:          payment.amount,
    currency:        payment.currency,
    applicationFee:  payment.applicationFeeAmount,
    netAmount:       payment.netAmount,
    createdAt:       (payment.stripeCreatedAt ?? payment.createdAt).toISOString(),
  };

  // Incrementar número de factura si hay InvoiceSettings (fire-and-forget)
  if (cfg) {
    db.invoiceSettings.update({
      where: { id: cfg.id },
      data:  { nextInvoiceNumber: { increment: 1 } },
    }).catch(() => {});
  }

  const doc    = createElement(InvoiceDocument, { d: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(doc as any);
  const filename = `factura-${invoiceNumber}.pdf`;

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
