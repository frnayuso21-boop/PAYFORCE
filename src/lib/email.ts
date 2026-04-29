import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "PayForce <pagos@payforce.co>";
const APP  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Email: invitación para guardar tarjeta ───────────────────────────────────
export async function sendCardInvitationEmail(opts: {
  to:           string;
  customerName: string;
  businessName: string;
  token:        string;
  expiresInDays?: number;
}) {
  const { to, customerName, businessName, token, expiresInDays = 7 } = opts;
  const url  = `${APP}/setup-card/${token}`;
  const first = customerName.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="font-size:17px;font-weight:700;color:#000;letter-spacing:-0.02em;">PayForce</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:18px;padding:36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;letter-spacing:-0.03em;">Hola, ${first} 👋</p>
          <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
            <strong>${businessName}</strong> ha actualizado su sistema de cobros.<br/>
            Por favor, añade tu tarjeta para que podamos procesar tus próximos recibos de forma segura e instantánea.
          </p>
          <div style="background:#F8F8FA;border-radius:12px;padding:16px 20px;margin-bottom:28px;font-size:13px;color:#666;line-height:1.6;">
            🔒 <strong>Seguro y sin cargos.</strong> Solo guardamos tu tarjeta para futuros cobros autorizados por ${businessName}. No se realizará ningún cargo ahora.
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:50px;">
                Añadir mi tarjeta →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
            Este enlace caduca en ${expiresInDays} días y es de uso único.<br/>
            Si no reconoces este mensaje, ignóralo.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="font-size:12px;color:#aaa;margin:0;">Procesado de forma segura por <strong>PayForce</strong> · Powered by Stripe</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      [to],
    subject: `${businessName} — Añade tu tarjeta para gestionar tus recibos`,
    html,
  });

  if (error) throw new Error(error.message);
}

// ─── Email: confirmación de pago al cliente ───────────────────────────────────
export async function sendPaymentReceiptEmail(opts: {
  to:           string;
  merchantName: string;
  amount:       number;
  currency:     string;
  description:  string | null;
  paymentIntentId: string;
  createdAt:    Date;
}) {
  const { to, merchantName, amount, currency, description, paymentIntentId, createdAt } = opts;

  const formattedAmount = (amount / 100).toFixed(2);
  const symbol = currency.toLowerCase() === "eur" ? "€" : currency.toUpperCase();
  const formattedDate = createdAt.toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
  const shortRef = `${paymentIntentId.substring(0, 16)}...`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr><td>
            <svg width="28" height="28" viewBox="0 0 28 28" style="vertical-align:middle;">
              <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="#0A0A0A"/>
            </svg>
          </td><td style="padding-left:8px;vertical-align:middle;">
            <span style="font-size:14px;font-weight:600;letter-spacing:0.06em;color:#0A0A0A;text-transform:uppercase;">${merchantName}</span>
          </td></tr></table>
        </td></tr>

        <tr><td style="background:#fff;border-radius:16px;padding:36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

          <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#0A0A0A;letter-spacing:-0.5px;">
            Pago confirmado
          </p>
          <p style="margin:0 0 32px;font-size:15px;color:#6B7280;line-height:1.6;">
            Hemos procesado tu pago correctamente.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;border:0.5px solid #E5E7EB;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#6B7280;padding-bottom:12px;">Importe</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#0A0A0A;padding-bottom:12px;">${formattedAmount}${symbol}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6B7280;padding-bottom:12px;">Concepto</td>
                  <td align="right" style="font-size:13px;color:#0A0A0A;padding-bottom:12px;">${description ?? "Pago"}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6B7280;padding-bottom:12px;">Fecha</td>
                  <td align="right" style="font-size:13px;color:#0A0A0A;padding-bottom:12px;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6B7280;">Referencia</td>
                  <td align="right" style="font-size:13px;color:#0A0A0A;font-family:monospace;">${shortRef}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAF3DE;border-radius:8px;margin-bottom:32px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#27500A;line-height:1.6;">
                ✅ Tu pago ha sido procesado correctamente. Guarda este email como comprobante.
              </p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:0.5px solid #E5E7EB;">
            <tr><td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.7;">
                Este email es un comprobante automático de pago.<br/>
                Para cualquier consulta contacta con <strong>${merchantName}</strong> directamente.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;">
                Procesado de forma segura por PayForce
              </p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from:    "PayForce <pagos@payforce.co>",
    to:      [to],
    subject: `Confirmación de pago — ${merchantName}`,
    html,
  });

  if (error) throw new Error(error.message);
}

// ─── Email: recordatorio de pago pendiente ────────────────────────────────────
export async function sendPaymentReminderEmail(opts: {
  to:            string;
  customerName:  string | null;
  businessName:  string;
  amount:        number;
  currency:      string;
  concept:       string | null;
  paymentUrl:    string;
  reminderNum:   number;
}) {
  const { to, customerName, businessName, amount, currency, concept, paymentUrl, reminderNum } = opts;
  const first = customerName ? customerName.split(" ")[0] : "cliente";
  const sym   = currency.toLowerCase() === "eur" ? "€" : currency.toUpperCase();
  const fmt   = `${(amount / 100).toFixed(2)}${sym}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="font-size:17px;font-weight:700;color:#000;letter-spacing:-0.02em;">PayForce</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:18px;padding:36px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;letter-spacing:-0.03em;">
            Hola, ${first} 👋
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
            Tienes un <strong>pago pendiente de ${fmt}</strong> con <strong>${businessName}</strong>${concept ? ` por concepto de <em>${concept}</em>` : ""}.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${paymentUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:50px;">
                Pagar ahora →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;line-height:1.6;">
            Si ya has realizado el pago, ignora este mensaje.<br/>
            Recordatorio ${reminderNum} de 3.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="font-size:12px;color:#aaa;margin:0;">Procesado por <strong>PayForce</strong> · Powered by Stripe</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      [to],
    subject: `Tienes un pago pendiente de ${businessName}`,
    html,
  });

  if (error) throw new Error(error.message);
}
