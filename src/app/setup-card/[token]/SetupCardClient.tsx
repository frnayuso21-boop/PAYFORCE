"use client";

import { useEffect, useState } from "react";
import { loadStripe }          from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface InviteData {
  clientSecret: string;
  customer:     { name: string; email: string };
  business:     { name: string };
}

// ─── Inner form (needs Elements context) ─────────────────────────────────────
function CardForm({ token, data }: { token: string; data: InviteData }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [state,  setState]  = useState<"idle" | "processing" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setState("processing");
    setErrMsg(null);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/setup-card/success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrMsg(error.message ?? "Error al guardar la tarjeta");
      setState("error");
      return;
    }

    // Marcar invitación como usada
    await fetch(`/api/subscriptions/invite/${token}/confirm`, { method: "POST" }).catch(() => null);
    setState("done");
  }

  if (state === "done") {
    return (
      <div style={s.card}>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>¡Tarjeta guardada!</p>
          <p style={{ fontSize: 14, color: "#666" }}>
            {data.business.name} podrá cobrar tus recibos de forma automática y segura.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={s.bizBadge}>{data.business.name}</div>
      <h1 style={s.title}>Añade tu tarjeta</h1>
      <p style={s.sub}>
        Hola, <strong>{data.customer.name.split(" ")[0]}</strong>. Guarda tu tarjeta para que{" "}
        <strong>{data.business.name}</strong> pueda procesar tus recibos de forma segura.
        No se realizará ningún cargo ahora.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={s.cardBox}>
          <PaymentElement
            options={{
              layout: "tabs",
              defaultValues: {
                billingDetails: {
                  name:  data.customer.name,
                  email: data.customer.email,
                },
              },
            }}
          />
        </div>

        {errMsg && <p style={s.err}>{errMsg}</p>}

        <button
          type="submit"
          disabled={state === "processing" || !stripe}
          style={{ ...s.btn, opacity: state === "processing" ? 0.6 : 1 }}
        >
          {state === "processing" ? "Guardando..." : "Guardar tarjeta"}
        </button>
      </form>

      <p style={s.legal}>
        🔒 Tus datos están cifrados y protegidos por Stripe. PayForce nunca almacena los datos de tu tarjeta.
      </p>
    </div>
  );
}

// ─── Outer shell ──────────────────────────────────────────────────────────────
export default function SetupCardClient({ token }: { token: string }) {
  const [data,    setData]    = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/subscriptions/invite/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d as InviteData);
      })
      .catch(() => setError("No se pudo cargar el enlace"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Screen><Spinner /></Screen>;

  if (error) return (
    <Screen>
      <div style={s.card}>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Enlace no válido</p>
          <p style={{ fontSize: 14, color: "#666" }}>{error}</p>
        </div>
      </div>
    </Screen>
  );

  if (!data) return null;

  return (
    <Screen>
      <Elements stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
        <CardForm token={token} data={data} />
      </Elements>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#F5F5F7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: "3px solid rgba(0,0,0,0.1)",
      borderTop: "3px solid #000",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 4px 32px rgba(0,0,0,0.1)",
  },
  bizBadge: {
    display: "inline-block",
    background: "#F0F0F0",
    borderRadius: 50,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#444",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 10px", letterSpacing: "-0.03em" },
  sub:   { fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 24px" },
  cardBox: {
    border: "1.5px solid #ddd",
    borderRadius: 10,
    padding: "14px 12px",
    marginBottom: 16,
    background: "#FAFAFA",
  },
  err: { color: "#FF3B30", fontSize: 13, marginBottom: 14, background: "#FFF0F0", padding: "8px 12px", borderRadius: 8 },
  btn: {
    width: "100%",
    padding: "14px",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 16,
  },
  legal: { fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.5 },
};
