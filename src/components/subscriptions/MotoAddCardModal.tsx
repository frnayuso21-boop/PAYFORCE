"use client";

import React, { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const BRAND_LABEL: Record<string, string> = {
  visa:       "Visa",
  mastercard: "Mastercard",
  amex:       "American Express",
  discover:   "Discover",
  diners:     "Diners",
  jcb:        "JCB",
  unionpay:   "UnionPay",
  unknown:    "Tarjeta",
};

export interface MotoAddCardCustomer {
  id:    string;
  name:  string;
  email: string;
}

interface MotoAddCardModalProps {
  customer: MotoAddCardCustomer;
  onClose:  () => void;
  onSaved:  () => void;
}

function MotoCardInner({
  customer,
  onClose,
  onSaved,
}: MotoAddCardModalProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [holderName, setHolderName] = useState(customer.name);
  const [cardComplete, setCardComplete] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [done, setDone]     = useState(false);

  const onCardChange = useCallback((e: { complete: boolean; error?: { message: string }; brand?: string }) => {
    setCardComplete(e.complete);
    if (e.error) setError(e.error.message);
    else setError(null);
    if (e.brand) setBrand(e.brand);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !holderName.trim()) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setBusy(true);
    setError(null);

    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
      billing_details: {
        name:  holderName.trim(),
        email: customer.email,
      },
    });

    if (pmError || !paymentMethod) {
      setError(pmError?.message ?? "No se pudo validar la tarjeta");
      setBusy(false);
      return;
    }

    const res = await fetch(`/api/subscriptions/customers/${customer.id}/moto-card`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ paymentMethodId: paymentMethod.id }),
    });

    const data = await res.json().catch(() => ({})) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Error al guardar la tarjeta");
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
    onSaved();
  }

  if (done) {
    return (
      <>
        <div style={headerRow}>
          <span style={title}>Tarjeta registrada</span>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div style={successBox}>
          <div style={successIcon}>✓</div>
          <p style={successTitle}>La tarjeta se ha guardado correctamente</p>
          <p style={successSub}>
            {customer.name} — {customer.email}
          </p>
          <button type="button" style={primaryBtn} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={headerRow}>
        <span style={title}>Añadir tarjeta manualmente (MOTO)</span>
        <button type="button" style={closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <p style={intro}>
        Cliente: <strong>{customer.name}</strong>
        <br />
        <span style={{ color: "#6B7280", fontSize: 13 }}>{customer.email}</span>
      </p>

      <form onSubmit={handleSubmit} style={{ padding: "0 20px" }}>
        <label style={label}>Nombre del titular</label>
        <input
          type="text"
          autoComplete="cc-name"
          value={holderName}
          onChange={(ev) => setHolderName(ev.target.value)}
          placeholder="Como figura en la tarjeta"
          style={textInput}
          required
        />

        <div style={cardRow}>
          <label style={label}>Datos de la tarjeta</label>
          {brand && brand !== "unknown" && (
            <span style={brandBadge}>{BRAND_LABEL[brand] ?? brand}</span>
          )}
        </div>
        <div style={cardBox}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize:   "16px",
                  color:      "#111827",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  "::placeholder": { color: "#9CA3AF" },
                },
                invalid: { color: "#DC2626" },
              },
              hidePostalCode: true,
            }}
            onChange={onCardChange}
          />
        </div>

        <p style={secureNote}>
          Los datos se transmiten de forma segura y no se almacenan en nuestros servidores.
          El procesamiento es gestionado por Stripe (PCI DSS).
        </p>

        {error && <p style={errBox}>{error}</p>}

        <div style={actions}>
          <button type="button" style={secondaryBtn} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            style={{ ...primaryBtn, opacity: busy || !cardComplete || !holderName.trim() ? 0.55 : 1 }}
            disabled={busy || !cardComplete || !holderName.trim() || !stripe}
          >
            {busy ? "Guardando…" : "Guardar tarjeta"}
          </button>
        </div>
      </form>
    </>
  );
}

export function MotoAddCardModal(props: MotoAddCardModalProps) {
  if (!stripePromise) {
    return (
      <div style={overlay} onClick={props.onClose} role="presentation">
        <div style={shell} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <p style={{ padding: 24, color: "#B91C1C" }}>
            Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. No se puede cargar el formulario de pago.
          </p>
          <button type="button" style={{ ...secondaryBtn, margin: "0 24px 24px" }} onClick={props.onClose}>
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={props.onClose} role="presentation">
      <div style={shell} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <Elements stripe={stripePromise} options={{ locale: "es" }}>
          <MotoCardInner {...props} />
        </Elements>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position:       "fixed",
  inset:          0,
  background:     "rgba(15, 23, 42, 0.45)",
  zIndex:         1000,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  padding:        16,
};

const shell: React.CSSProperties = {
  background:    "#fff",
  borderRadius:  16,
  width:         "100%",
  maxWidth:      440,
  maxHeight:     "90vh",
  overflowY:     "auto",
  boxShadow:     "0 25px 50px -12px rgba(0,0,0,0.25)",
  fontFamily:    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const headerRow: React.CSSProperties = {
  display:       "flex",
  alignItems:    "center",
  justifyContent:"space-between",
  padding:       "18px 20px",
  borderBottom:  "1px solid #F3F4F6",
};

const title: React.CSSProperties = {
  fontSize:   16,
  fontWeight: 600,
  color:      "#111827",
};

const closeBtn: React.CSSProperties = {
  border:          "none",
  background:      "transparent",
  fontSize:        22,
  lineHeight:      1,
  cursor:          "pointer",
  color:           "#9CA3AF",
  padding:         "4px 8px",
};

const intro: React.CSSProperties = {
  padding:     "14px 20px 0",
  fontSize:    14,
  color:       "#374151",
  lineHeight:  1.5,
};

const label: React.CSSProperties = {
  display:       "block",
  fontSize:      11,
  fontWeight:    600,
  color:         "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom:  6,
};

const textInput: React.CSSProperties = {
  width:        "100%",
  boxSizing:    "border-box",
  padding:      "12px 14px",
  borderRadius: 10,
  border:       "1.5px solid #E5E7EB",
  fontSize:     15,
  marginBottom: 16,
};

const cardRow: React.CSSProperties = {
  display:       "flex",
  alignItems:    "center",
  justifyContent:"space-between",
  marginBottom:  6,
};

const brandBadge: React.CSSProperties = {
  fontSize:     12,
  fontWeight:   600,
  color:        "#1D4ED8",
  background:   "#EFF6FF",
  padding:      "4px 10px",
  borderRadius: 6,
};

const cardBox: React.CSSProperties = {
  border:       "1.5px solid #E5E7EB",
  borderRadius: 10,
  padding:      "14px 12px",
  background:   "#FAFAFA",
  marginBottom: 12,
};

const secureNote: React.CSSProperties = {
  fontSize:     12,
  color:        "#6B7280",
  lineHeight:   1.5,
  marginBottom: 16,
  padding:      "0 2px",
};

const errBox: React.CSSProperties = {
  color:        "#B91C1C",
  fontSize:     13,
  background:   "#FEF2F2",
  padding:      "10px 12px",
  borderRadius: 8,
  marginBottom: 12,
};

const actions: React.CSSProperties = {
  display:        "flex",
  gap:            10,
  justifyContent: "flex-end",
  padding:        "8px 20px 20px",
};

const primaryBtn: React.CSSProperties = {
  padding:      "12px 20px",
  borderRadius: 10,
  border:       "none",
  background:   "#111827",
  color:        "#fff",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding:      "12px 20px",
  borderRadius: 10,
  border:       "1.5px solid #E5E7EB",
  background:   "#fff",
  color:        "#374151",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};

const successBox: React.CSSProperties = {
  padding:    "32px 24px 28px",
  textAlign:  "center",
};

const successIcon: React.CSSProperties = {
  width:          56,
  height:         56,
  borderRadius:   "50%",
  background:     "#D1FAE5",
  color:          "#059669",
  fontSize:       28,
  fontWeight:     700,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  margin:         "0 auto 16px",
};

const successTitle: React.CSSProperties = {
  fontSize:   17,
  fontWeight: 600,
  color:      "#111827",
  margin:     "0 0 8px",
};

const successSub: React.CSSProperties = {
  fontSize:    14,
  color:       "#6B7280",
  margin:      "0 0 24px",
  lineHeight:  1.5,
};
