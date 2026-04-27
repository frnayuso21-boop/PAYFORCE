import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM ?? "PayForce <cobros@payforce.app>";
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `${businessName} — Añade tu tarjeta para gestionar tus recibos`,
    html,
  });

  if (error) throw new Error(error.message);
}
