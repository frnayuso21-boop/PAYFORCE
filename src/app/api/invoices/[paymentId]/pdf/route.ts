/**
 * GET /api/invoices/[paymentId]/pdf
 *
 * Endpoint PÚBLICO para que el cliente descargue su recibo de pago
 * tras completar el checkout en /pay/[token].
 * Solo funciona para pagos con status SUCCEEDED.
 */
import { NextRequest, NextResponse } from "next/server";
import { renderToStream }            from "@react-pdf/renderer";
import { createElement }             from "react";
import { db }                        from "@/lib/db";
import { ReceiptDocument }           from "@/lib/receipt-pdf";
import type { ReceiptData }          from "@/lib/receipt-pdf";

export const dynamic = "force-dynamic";

function fmt(cents: number, currency = "eur") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(d));
}

function fmtTime(d: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

function pmLabel(type?: string | null): string {
  switch (type) {
    case "card":       return "Tarjeta";
    case "bizum":      return "Bizum";
    case "apple_pay":  return "Apple Pay";
    case "google_pay": return "Google Pay";
    case "klarna":     return "Klarna";
    case "sepa_debit": return "SEPA Débito";
    default:           return "—";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;

  const payment = await db.payment.findUnique({
    where:   { id: paymentId },
    include: {
      connectedAccount: {
        select: { businessName: true, primaryColor: true },
      },
    },
  });

  if (!payment || payment.status !== "SUCCEEDED") {
    return NextResponse.json({ error: "Pago no encontrado o no completado" }, { status: 404 });
  }

  let meta: Record<string, string> = {};
  try { if (payment.metadata) meta = JSON.parse(payment.metadata) as Record<string, string>; } catch { /* ignore */ }

  const payDate = payment.stripeCreatedAt ?? payment.createdAt;
  const year    = payDate.getFullYear();
  const suffix  = paymentId.slice(-4).toUpperCase();

  const data: ReceiptData = {
    reference:     `PF-${year}-${suffix}`,
    date:          fmtDate(payDate),
    time:          fmtTime(payDate),
    merchantName:  payment.connectedAccount?.businessName || "PayForce",
    accentColor:   payment.connectedAccount?.primaryColor || "#0A0A0A",
    customerName:  payment.customerName,
    customerEmail: payment.customerEmail,
    description:   payment.description,
    amount:        payment.amount,
    currency:      payment.currency,
    paymentMethod: pmLabel(meta.paymentMethodType),
    paymentId:     payment.id,
  };

  const doc    = createElement(ReceiptDocument, { d: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(doc as any);

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
      "Content-Disposition": `attachment; filename="recibo-${paymentId}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
