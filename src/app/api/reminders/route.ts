import { NextRequest, NextResponse }   from "next/server";
import { db }                          from "@/lib/db";
import { requireAuth, AuthError, getUserPrimaryAccount } from "@/lib/auth";
import { sendPaymentReminderEmail }    from "@/lib/email";

export const dynamic = "force-dynamic";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://payforce.co";

// ─── GET /api/reminders ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const account  = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ reminders: [] });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    const reminders = await db.paymentReminder.findMany({
      where: {
        connectedAccountId: account.id,
        ...(status ? { status } : {}),
      },
      include: {
        paymentLink: { select: { token: true, description: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ reminders });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH /api/reminders ─────────────────────────────────────────────────────
// body: { id, action: "send" | "cancel" }
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const account  = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 404 });
    const body = await req.json() as { id?: string; action?: string };
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id y action requeridos" }, { status: 400 });
    }

    const reminder = await db.paymentReminder.findFirst({
      where: { id, connectedAccountId: account.id },
      include: {
        paymentLink: { select: { token: true, description: true } },
        account:     { select: { businessName: true } },
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Recordatorio no encontrado" }, { status: 404 });
    }

    if (action === "cancel") {
      await db.paymentReminder.update({
        where: { id },
        data:  { status: "cancelled", cancelledAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "send") {
      if (!reminder.customerEmail) {
        return NextResponse.json({ error: "Este recordatorio no tiene email de cliente" }, { status: 400 });
      }
      const newCount = reminder.remindersSent + 1;
      await sendPaymentReminderEmail({
        to:           reminder.customerEmail,
        customerName: reminder.customerName,
        businessName: reminder.account.businessName ?? "Tu comercio",
        amount:       reminder.amount,
        currency:     reminder.currency,
        concept:      reminder.paymentLink.description,
        paymentUrl:   `${APP}/pay/${reminder.paymentLink.token}`,
        reminderNum:  newCount,
      });
      await db.paymentReminder.update({
        where: { id },
        data:  {
          remindersSent:  newCount,
          lastReminderAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
