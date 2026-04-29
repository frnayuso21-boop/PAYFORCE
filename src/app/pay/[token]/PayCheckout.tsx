"use client";

import { useState, useEffect } from "react";
import { loadStripe }          from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── CSS Keyframes ────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @keyframes spin      { from { transform: rotate(0deg)   } to { transform: rotate(360deg)  } }
  @keyframes pfPulse   { 0%,100% { opacity:.3; transform:scale(.88) } 50% { opacity:1; transform:scale(1) } }
  @keyframes pfProgress{ from { width:0% } to { width:100% } }
  @keyframes pfFadeIn  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
`;

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({
  color, businessName, logoUrl,
}: {
  color: string; businessName: string; logoUrl?: string | null;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: color,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "24px", zIndex: 50,
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Icono animado */}
      <div style={{ position: "relative", width: "64px", height: "64px" }}>
        <svg width="64" height="64" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.1 }}>
          <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="white" />
        </svg>
        <svg style={{
          position: "absolute", top: 0, left: 0,
          animation: "spin 1.8s linear infinite",
          transformOrigin: "center",
        }} width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="white"
            strokeWidth="1.5" strokeDasharray="40 136"
            strokeLinecap="round" opacity="0.5" />
        </svg>
        <svg style={{
          position: "absolute", top: 0, left: 0,
          animation: "pfPulse 1.8s ease-in-out infinite",
        }} width="64" height="64" viewBox="0 0 28 28" fill="none">
          <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="white" />
        </svg>
      </div>

      {/* Logo o nombre del merchant */}
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt={businessName} style={{ height: "32px", objectFit: "contain" }} />
      ) : (
        <p style={{
          fontSize: "15px", fontWeight: 500, color: "#fff",
          letterSpacing: "0.08em", textTransform: "uppercase",
          margin: 0,
        }}>{businessName}</p>
      )}

      <p style={{
        fontSize: "11px", color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
      }}>Cargando pago seguro</p>

      {/* Barra de progreso */}
      <div style={{
        width: "80px", height: "2px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "#fff",
          borderRadius: "2px",
          animation: "pfProgress 1.5s ease-in-out forwards",
        }} />
      </div>

      <p style={{
        position: "absolute", bottom: "20px",
        fontSize: "10px", color: "rgba(255,255,255,0.2)",
        letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
      }}>Procesado por PayForce</p>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function CheckoutHeader({
  businessName, logoUrl, color,
}: {
  businessName: string; logoUrl?: string | null; color: string;
}) {
  return (
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
          <img src={logoUrl} alt={businessName} style={{
            height: "28px", maxWidth: "120px",
            objectFit: "contain", borderRadius: "4px",
          }} />
        ) : (
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z" fill="white" />
            </svg>
          </div>
        )}
        <span style={{
          fontSize: "13px", fontWeight: 500, color: "#fff",
          letterSpacing: "-0.2px",
        }}>{businessName}</span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        fontSize: "10px", color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L10 3V6C10 8.5 8 10.5 6 11C4 10.5 2 8.5 2 6V3L6 1Z"
            stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        </svg>
        Pago seguro
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function CheckoutFooter() {
  return (
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
  );
}

// ─── Formulario de pago ───────────────────────────────────────────────────────

function CheckoutForm({
  token, amount, currency, customerEmail, color,
}: {
  token: string; amount: number; currency: string;
  customerEmail?: string | null; color: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${token}`
      : `/pay/${token}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        ...(customerEmail ? { receipt_email: customerEmail } : {}),
      },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar el pago");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <PaymentElement options={{
        layout: "tabs",
        defaultValues: { billingDetails: { email: customerEmail ?? "" } },
      }} />

      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "8px",
          background: "#FEF2F2", border: "0.5px solid #FECACA",
          borderRadius: "10px", padding: "12px 14px",
          fontSize: "13px", color: "#DC2626",
        }}>
          <span style={{ marginTop: "1px", fontSize: "14px", lineHeight: 1 }}>⚠</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          background: loading ? `${color}99` : color,
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          padding: "14px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "opacity 0.2s",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.2px",
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: "15px", height: "15px",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              display: "inline-block",
            }} />
            Procesando…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="white" strokeWidth="1.5" />
            </svg>
            Pagar {formatCurrency(amount / 100, currency)}
          </>
        )}
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export interface PayCheckoutProps {
  clientSecret:   string;
  token:          string;
  amount:         number;
  currency:       string;
  description?:   string | null;
  customerEmail?: string | null;
  customerName?:  string | null;
  businessName:   string;
  primaryColor?:  string | null;
  logoUrl?:       string | null;
}

export function PayCheckout({
  clientSecret,
  token,
  amount,
  currency,
  description,
  customerEmail,
  customerName,
  businessName,
  primaryColor,
  logoUrl,
}: PayCheckoutProps) {
  const [stage, setStage]   = useState<"loading" | "checkout">("loading");
  const [ready, setReady]   = useState(false);

  const color = primaryColor || "#0A0A0A";

  useEffect(() => {
    setReady(true);
    const timer = setTimeout(() => setStage("checkout"), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      {stage === "loading" && (
        <LoadingScreen
          color={color}
          businessName={businessName}
          logoUrl={logoUrl}
        />
      )}

      {stage === "checkout" && (
        <div style={{
          fontFamily: "Inter, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#F9FAFB",
          animation: "pfFadeIn 0.4s ease both",
        }}>
          <CheckoutHeader
            businessName={businessName}
            logoUrl={logoUrl}
            color={color}
          />

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
            }}>
              {/* Resumen del pago */}
              <div style={{
                background: "#fff",
                borderRadius: "14px",
                border: "0.5px solid #E5E7EB",
                padding: "20px",
              }}>
                <p style={{
                  fontSize: "11px", fontWeight: 600, color: "#9CA3AF",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  margin: "0 0 6px",
                }}>Total a pagar</p>
                <p style={{
                  fontSize: "32px", fontWeight: 700, color: "#111827",
                  letterSpacing: "-1px", margin: "0 0 2px",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {formatCurrency(amount / 100, currency)}
                </p>
                {description && (
                  <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>{description}</p>
                )}
                {customerName && (
                  <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "4px 0 0" }}>
                    Para: <span style={{ color: "#6B7280", fontWeight: 500 }}>{customerName}</span>
                  </p>
                )}
              </div>

              {/* Formulario de pago */}
              <div style={{
                background: "#fff",
                borderRadius: "14px",
                border: "0.5px solid #E5E7EB",
                padding: "20px",
              }}>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    loader: "auto",
                    appearance: {
                      theme: "stripe",
                      variables: {
                        fontFamily:       "Inter, sans-serif",
                        borderRadius:     "10px",
                        colorPrimary:     color,
                        colorBackground:  "#F9FAFB",
                        colorText:        "#111827",
                        colorDanger:      "#EF4444",
                        spacingUnit:      "4px",
                        fontSizeBase:     "14px",
                      },
                      rules: {
                        ".Input":         { padding: "12px 14px", fontSize: "14px", background: "#fff" },
                        ".Input:focus":   { boxShadow: `0 0 0 2px ${color}33` },
                        ".Label":         { fontWeight: "500", color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" },
                        ".Tab":           { borderRadius: "8px", padding: "8px 12px" },
                        ".Tab--selected": { backgroundColor: color, color: "#fff" },
                        ".p-Logo":        { display: "none" },
                        ".p-Logo-img":    { display: "none" },
                        ".p-TermsText":   { display: "none" },
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    token={token}
                    amount={amount}
                    currency={currency}
                    customerEmail={customerEmail}
                    color={color}
                  />
                </Elements>
              </div>
            </div>
          </div>

          <CheckoutFooter />
        </div>
      )}
    </>
  );
}
