"use client";

import { useEffect, useState } from "react";
import { formatCurrency }      from "@/lib/utils";

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @keyframes slideUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
  @keyframes haloSpin { 0%,100% { transform:scale(1); opacity:.18 } 50% { transform:scale(1.14); opacity:.08 } }
  @keyframes spin      { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
`;

interface Props {
  amount:        number;
  currency:      string;
  description?:  string | null;
  businessName?: string;
  customerName?: string | null;
  paymentId?:    string | null;
  primaryColor?: string | null;
  logoUrl?:      string | null;
  createdAt?:    string; // ISO timestamp
  paymentMethod?: string | null;
}

export function PaySuccess({
  amount,
  currency,
  description,
  businessName = "PayForce",
  customerName,
  paymentId,
  primaryColor,
  logoUrl,
  createdAt,
  paymentMethod,
}: Props) {
  const [phase,        setPhase]        = useState<"hex" | "check" | "done">("hex");
  const [downloading,  setDownloading]  = useState(false);
  const [downloadErr,  setDownloadErr]  = useState<string | null>(null);

  const color    = primaryColor || "#0A0A0A";
  const dateStr  = createdAt
    ? new Date(createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr  = createdAt
    ? new Date(createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // Referencia: PF-2026-XXXX (extraemos parte del paymentId si existe)
  const reference = paymentId
    ? `PF-${new Date().getFullYear()}-${paymentId.slice(-4).toUpperCase()}`
    : `PF-${new Date().getFullYear()}-XXXX`;

  const pmLabel = (() => {
    switch (paymentMethod) {
      case "card":       return "Tarjeta";
      case "bizum":      return "Bizum";
      case "apple_pay":  return "Apple Pay";
      case "google_pay": return "Google Pay";
      case "klarna":     return "Klarna";
      case "sepa_debit": return "SEPA Débito";
      default:           return "—";
    }
  })();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("check"), 400);
    const t2 = setTimeout(() => setPhase("done"),  1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  async function handleDownloadInvoice() {
    if (!paymentId) return;
    setDownloading(true);
    setDownloadErr(null);
    try {
      const res = await fetch(`/api/invoices/${paymentId}/pdf`);
      if (!res.ok) { setDownloadErr("No se pudo generar la factura."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `factura-${paymentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadErr("Error de red al descargar.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#F9FAFB",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div style={{
        background: color,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={businessName} style={{ height: "28px", maxWidth: "120px", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
                <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="white" />
              </svg>
            </div>
          )}
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", letterSpacing: "-0.2px" }}>
            {businessName}
          </span>
        </div>
      </div>

      {/* Contenido central */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 20px 24px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "440px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {/* Icono de éxito */}
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #E5E7EB",
            padding: "32px 20px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}>
            {/* Círculo verde con tick */}
            <div style={{ position: "relative", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {phase === "done" && (
                <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
                  animation: "haloSpin 2s ease-in-out infinite",
                }} />
              )}
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "#ECFDF5",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
                transform:  phase === "hex" ? "scale(0.6)" : "scale(1)",
                opacity:    phase === "hex" ? 0 : 1,
              }}>
                <svg viewBox="0 0 48 48" width="32" height="32" fill="none">
                  <polyline
                    points="10,26 20,36 38,16"
                    stroke="#10B981"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={{
                      strokeDasharray: 50,
                      strokeDashoffset: phase === "check" || phase === "done" ? 0 : 50,
                      transition: "stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1) 0.1s",
                    }}
                  />
                </svg>
              </div>
            </div>

            <div style={{
              textAlign: "center",
              opacity:    phase === "done" ? 1 : 0,
              transform:  phase === "done" ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
            }}>
              {customerName && (
                <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "0 0 4px" }}>
                  Gracias, {customerName}
                </p>
              )}
              <p style={{
                fontSize: "30px", fontWeight: 700,
                color: "#111827", letterSpacing: "-1px",
                margin: "0 0 2px",
              }}>
                {formatCurrency(amount / 100, currency)}
              </p>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#10B981", margin: "0 0 6px" }}>
                ¡Pago completado!
              </p>
              {description && (
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>{description}</p>
              )}
            </div>
          </div>

          {/* Tabla de resumen */}
          <div style={{
            background: "#fff",
            borderRadius: "14px",
            border: "0.5px solid #E5E7EB",
            overflow: "hidden",
            opacity:    phase === "done" ? 1 : 0,
            transition: "opacity 0.4s ease 0.2s",
          }}>
            {[
              { label: "Importe",          value: formatCurrency(amount / 100, currency) },
              { label: "Concepto",         value: description || "—" },
              { label: "Método de pago",   value: pmLabel },
              { label: "Referencia",       value: reference },
              { label: "Fecha",            value: dateStr },
              { label: "Hora",             value: timeStr },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < arr.length - 1 ? "0.5px solid #F3F4F6" : "none",
              }}>
                <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>
                  {row.label}
                </span>
                <span style={{
                  fontSize: "13px", color: "#111827", fontWeight: 500,
                  textAlign: "right", maxWidth: "60%",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Botón PDF */}
          {paymentId && (
            <div style={{
              opacity:    phase === "done" ? 1 : 0,
              transition: "opacity 0.4s ease 0.3s",
            }}>
              <button
                onClick={() => void handleDownloadInvoice()}
                disabled={downloading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "0.5px solid #E5E7EB",
                  borderRadius: "10px",
                  background: "#fff",
                  cursor: downloading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A0A0A",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {downloading ? (
                  <>
                    <span style={{
                      width: "14px", height: "14px",
                      border: "2px solid #E5E7EB",
                      borderTopColor: "#6B7280",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }} />
                    Generando PDF…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v13M8 11l4 4 4-4M2 17v2a2 2 0 002 2h16a2 2 0 002-2v-2"
                        stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Descargar factura PDF
                  </>
                )}
              </button>
              {downloadErr && (
                <p style={{ fontSize: "12px", color: "#EF4444", textAlign: "center", margin: "8px 0 0" }}>
                  {downloadErr}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 20px",
        borderTop: "0.5px solid #F3F4F6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "10px", color: "#D1D5DB",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <svg width="9" height="9" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="#D1D5DB" />
          </svg>
          PayForce
        </div>
        <span style={{
          fontSize: "10px", color: "#D1D5DB",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          PCI DSS · SSL 256-bit
        </span>
      </div>
    </div>
  );
}
