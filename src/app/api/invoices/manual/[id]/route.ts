import { NextRequest, NextResponse } from "next/server";
import { renderToStream }            from "@react-pdf/renderer";
import { createElement }             from "react";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";
import { ManualInvoiceDocument }     from "@/lib/invoice-manual-pdf";

export const dynamic = "force-dynamic";

async function getOwnedInvoice(id: string, accountIds: string[]) {
  return db.manualInvoice.findFirst({
    where:   { id, connectedAccountId: { in: accountIds } },
    include: { lines: { orderBy: { position: "asc" } } },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const asPdf = searchParams.get("pdf") === "1";

    const invoice = await getOwnedInvoice(id, ids);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!asPdf) return NextResponse.json({ invoice });

    // Genera PDF
    const account  = await db.connectedAccount.findUnique({
      where:   { id: invoice.connectedAccountId },
      include: { invoiceSettings: true },
    });
    const cfg = account?.invoiceSettings;

    const doc    = createElement(ManualInvoiceDocument, { invoice, settings: cfg ?? null });
    const stream = await renderToStream(doc);

    // @ts-expect-error Node readable stream
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
        "Content-Disposition": `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;
    const existing = await getOwnedInvoice(id, ids);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const allowed = ["status","clientName","clientEmail","clientAddress","clientTaxId","dueDate","notes","paymentTerms","bankAccount"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) data[k] = k === "dueDate" ? new Date(body[k]) : body[k];
    }
    const invoice = await db.manualInvoice.update({ where: { id }, data, include: { lines: true } });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req);
    const ids = await getUserAccountIds(user.id);
    const { id } = await params;
    const existing = await getOwnedInvoice(id, ids);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.manualInvoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
