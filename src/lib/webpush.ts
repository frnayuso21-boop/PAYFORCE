import webpush from "web-push";
import { db } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL ?? "mailto:fran@payforce.co";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys no configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

/**
 * Envía una notificación push a todas las suscripciones del usuario.
 * Las suscripciones expiradas o inválidas se eliminan automáticamente.
 * Nunca lanza excepción — los errores se loguean silenciosamente.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    ensureConfigured();
  } catch (err) {
    console.warn("[webpush] VAPID no configurado:", err instanceof Error ? err.message : err);
    return;
  }

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Suscripción expirada — eliminar
          await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => null);
        } else {
          console.warn("[webpush] Error enviando notificación:", err instanceof Error ? err.message : err);
        }
      }
    })
  );
}
