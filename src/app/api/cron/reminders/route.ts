import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { sendPaymentReminderEmail }  from "@/lib/email";

export const dynamic = "force-dynamic";

// Días entre recordatorios: 1º a los 3d, 2º a los 4d, 3º a los 7d
const REMINDER_DAYS = [3, 4, 7];

// Proteger el endpoint con el secret de Vercel Cron
function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Sin secret configurado, permitir (dev)
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Buscar todos los recordatorios pendientes cuya próxima fecha ya llegó
  const reminders = await db.paymentReminder.findMany({
    where: {
      status:         "pending",
      nextReminderAt: { lte: now },
    },
    include: {
      paymentLink: { select: { token: true, description: true } },
      account:     { select: { businessName: true } },
    },
    take: 200,
  });

  const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://payforce.co";

  let sent    = 0;
  let expired = 0;
  let errors  = 0;

  for (const reminder of reminders) {
    try {
      if (reminder.remindersSent >= 3) {
        // Marcar expirado y notificar al merchant si tiene email
        await db.paymentReminder.update({
          where: { id: reminder.id },
          data:  { status: "expired" },
        });
        expired++;
        continue;
      }

      const newCount   = reminder.remindersSent + 1;
      const daysNext   = REMINDER_DAYS[newCount] ?? null; // días para el siguiente
      const nextAt     = daysNext
        ? new Date(now.getTime() + daysNext * 24 * 60 * 60 * 1000)
        : null;
      const newStatus  = newCount >= 3 ? "pending" : "pending"; // sigue pending hasta paid/expired

      // Enviar email si hay dirección
      if (reminder.customerEmail) {
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
      }

      await db.paymentReminder.update({
        where: { id: reminder.id },
        data:  {
          remindersSent:  newCount,
          lastReminderAt: now,
          nextReminderAt: newCount >= 3 ? null : nextAt,
          status:         newStatus,
        },
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: reminders.length,
    sent,
    expired,
    errors,
  });
}
