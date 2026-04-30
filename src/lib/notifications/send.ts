/**
 * src/lib/notifications/send.ts
 *
 * Centraliza el envío de notificaciones push para PayForce.
 * Re-exporta sendPushToUser desde la lib existente y añade sendPushToAdmin.
 */

import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/webpush";

export { sendPushToUser };

export interface PushNotification {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

/**
 * Envía una notificación push al admin de PayForce.
 * Busca primero por ADMIN_EMAIL, luego por rol ADMIN.
 */
export async function sendPushToAdmin(notification: PushNotification): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? "fran@payforce.co";

  const adminUser = await db.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { role: "ADMIN"     },
      ],
    },
    select: { id: true },
  });

  if (!adminUser) {
    console.warn("[notifications] Admin user not found for push notification");
    return;
  }

  await sendPushToUser(adminUser.id, notification);
}
