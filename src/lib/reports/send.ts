import { Resend } from "resend";
import type { Manager } from "@prisma/client";
import type { ReportData } from "./generate";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada. Añádela a las variables de entorno.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "PayForce <pagos@payforce.co>";

function buildHtml(manager: Manager, report: ReportData): string {
  const { period, totalAmount, transactionCount, changeVsPrev, businessName } = report;

  const fmt = (n: number) =>
    (n / 100).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "€";

  const changeStr =
    changeVsPrev !== null
      ? `${changeVsPrev >= 0 ? "+" : ""}${changeVsPrev}%`
      : "—";

  const changeColor = changeVsPrev === null
    ? "#64748b"
    : changeVsPrev >= 0
    ? "#16a34a"
    : "#dc2626";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informe semanal PayForce</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">

        <!-- Header -->
        <tr>
          <td style="background:#1d1d1f;padding:28px 32px 24px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#86868b;">PayForce</p>
            <h1 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#fff;line-height:1.2;">
              Informe semanal
            </h1>
            <p style="margin:0;font-size:13px;color:#86868b;">
              Semana del ${period.label}
            </p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-size:15px;color:#1d1d1f;">
              Hola <strong>${manager.name}</strong>,
            </p>
            <p style="margin:10px 0 0;font-size:14px;color:#6e6e73;line-height:1.5;">
              Aquí tienes el informe de ventas de <strong>${businessName}</strong>
              correspondiente a la semana del ${period.label}.
            </p>
          </td>
        </tr>

        <!-- Métricas -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-right:8px;">
                  <div style="background:#f5f5f7;border-radius:12px;padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#86868b;">Total cobrado</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#1d1d1f;">${fmt(totalAmount)}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;">
                  <div style="background:#f5f5f7;border-radius:12px;padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#86868b;">Transacciones</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#1d1d1f;">${transactionCount}</p>
                  </div>
                </td>
              </tr>
            </table>
            <div style="margin-top:12px;background:#f5f5f7;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:13px;color:#6e6e73;">vs semana anterior:</span>
              <span style="font-size:15px;font-weight:700;color:${changeColor};">${changeStr}</span>
            </div>
          </td>
        </tr>

        <!-- Adjunto -->
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.5;">
              Adjunto encontrarás el detalle completo en formato CSV con todas las
              transacciones del período.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="https://payforce.co/app/dashboard"
               style="display:inline-block;background:#0071e3;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:980px;padding:12px 24px;">
              Ver dashboard completo →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f7;padding:16px 32px;border-top:1px solid #e5e5ea;">
            <p style="margin:0;font-size:11px;color:#86868b;">
              Has recibido este informe porque estás configurado como gestor en PayForce.
              Para dejar de recibirlo, contacta al administrador de la cuenta.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReport(manager: Manager, report: ReportData): Promise<void> {
  const csvBuffer = Buffer.from(report.csvContent, "utf-8");
  const dateSlug = report.period.from.toISOString().slice(0, 10);

  const html = buildHtml(manager, report);

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: manager.email,
    subject: `Informe semanal PayForce — semana del ${report.period.label}`,
    html,
    attachments: [
      {
        filename: `informe-${dateSlug}.csv`,
        content: csvBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
