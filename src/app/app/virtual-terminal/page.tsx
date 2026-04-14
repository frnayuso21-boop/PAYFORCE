"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, Phone, Loader2, CheckCircle2, XCircle, User, Mail, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const KEYS = ["1","2","3","4","5","6","7","8","9",".", "0","⌫"];

function fmt(raw: string) {
  if (!raw || raw === "0") return "0,00";
  const n = parseInt(raw.replace(".", ""), 10) / 100;
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toCents(raw: string) { return Math.round(parseInt((raw||"0").replace(".", ""), 10)); }
function toEuros(raw: string)  { return parseInt((raw||"0").replace(".", ""), 10) / 100; }

/* ─── Formulario interno (necesita contexto Stripe) ──────────────────────── */
function MotoForm() {
  const router   = useRouter();
  const stripe   = useStripe();
  const elements = useElements();

  const [step,          setStep]          = useState<"amount"|"card"|"result">("amount");
  const [raw,           setRaw]           = useState("000");
  const [description,   setDescription]   = useState("");
  const [customerName,  setCustomerName]  = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [result,        setResult]        = useState<"success"|"error"|null>(null);
  const [paidAmount,    setPaidAmount]    = useState(0);

  function handleKey(k: string) {
    if (k === "⌫") { setRaw((p) => p.length <= 1 ? "0" : p.slice(0, -1)); return; }
    if (k === ".") return;
    setRaw((p) => { const n = p === "0" ? k : p+k; return n.length > 8 ? p : n; });
  }

  async function handleCharge() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setLoading(true);
    setError("");
    try {
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: {
          name:  customerName  || undefined,
          email: customerEmail || undefined,
        },
      });
      if (pmError) throw new Error(pmError.message);

      const res  = await fetch("/api/payments/moto", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          paymentMethodId: paymentMethod!.id,
          amount:          toCents(raw),
          description:     description || "Cobro por teléfono",
          customerName,
          customerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.ok) { setPaidAmount(toCents(raw)); setResult("success"); setStep("result"); }
      else throw new Error("Pago no completado: " + data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setResult("error");
      setStep("result");
    } finally {
      setLoading(false);
    }
  }

  /* ── PASO: IMPORTE ──────────────────────────────────────────────────────── */
  if (step === "amount") return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white select-none">
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-white/40" />
          <span className="text-[13px] font-semibold tracking-widest text-white/50 uppercase">Cobro por teléfono</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex flex-col items-center justify-center flex-1 pb-2">
        <div className="flex items-start gap-1 mb-4">
          <span className="mt-3 text-[22px] font-light text-white/40">€</span>
          <span className={cn("text-[60px] font-bold tabular-nums leading-none", toEuros(raw) === 0 ? "text-white/20" : "text-white")}>
            {fmt(raw)}
          </span>
        </div>
        <input type="text" placeholder="Concepto (opcional)" value={description}
          onChange={(e) => setDescription(e.target.value)} maxLength={60}
          className="w-52 rounded-2xl bg-white/8 px-4 py-2.5 text-center text-[14px] text-white placeholder:text-white/25 outline-none" />
      </div>

      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {KEYS.map((k) => (
            <button key={k} onClick={() => handleKey(k)}
              className={cn("flex h-[66px] items-center justify-center rounded-2xl text-[28px] font-medium active:scale-95",
                k === "⌫" ? "bg-white/6 text-white/50" : "bg-white/10 text-white active:bg-white/18")}>
              {k === "⌫" ? "⌫" : k}
            </button>
          ))}
        </div>
        <button onClick={() => toCents(raw) >= 50 && setStep("card")}
          disabled={toCents(raw) < 50}
          className="w-full h-[58px] rounded-2xl bg-white text-[#0a0a0f] text-[17px] font-bold disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          Siguiente · €{fmt(raw)}
        </button>
      </div>
      <div className="pb-8" />
    </div>
  );

  /* ── PASO: TARJETA ──────────────────────────────────────────────────────── */
  if (step === "card") return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white">
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => setStep("amount")} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold tracking-widest text-white/50 uppercase">Datos de tarjeta</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-5 space-y-4">
        {/* Importe */}
        <div className="rounded-2xl bg-white/6 px-4 py-3 text-center">
          <p className="text-[13px] text-white/40 mb-0.5">Importe a cobrar</p>
          <p className="text-[32px] font-bold">€{fmt(raw)}</p>
          {description && <p className="text-[12px] text-white/30 mt-0.5">{description}</p>}
        </div>

        {/* Datos cliente */}
        <div className="space-y-2.5">
          <Field icon={<User className="h-4 w-4" />} placeholder="Nombre del titular" value={customerName} onChange={setCustomerName} />
          <Field icon={<Mail className="h-4 w-4" />} placeholder="Email (opcional)" value={customerEmail} onChange={setCustomerEmail} type="email" />
          <Field icon={<FileText className="h-4 w-4" />} placeholder="Concepto" value={description} onChange={setDescription} />
        </div>

        {/* Card Element cifrado */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Datos de tarjeta</p>
          <div className="rounded-2xl bg-white/8 px-4 py-4 border border-white/10">
            <CardElement options={{
              style: { base: { color: "#fff", fontSize: "16px", fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: "rgba(255,255,255,0.3)" } }, invalid: { color: "#f87171" } },
              hidePostalCode: true,
            }} />
          </div>
          <p className="mt-2 text-[10px] text-white/20 text-center">
            🔒 Datos cifrados con 3D Secure · No se almacenan en nuestros servidores
          </p>
        </div>

        {error && <p className="text-[13px] text-red-400 text-center">{error}</p>}

        <button onClick={handleCharge} disabled={loading || !stripe}
          className="w-full h-[58px] rounded-2xl bg-white text-[#0a0a0f] text-[17px] font-bold disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2.5">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>🔒 Cobrar €{fmt(raw)}</>}
        </button>
      </div>
      <div className="pb-10" />
    </div>
  );

  /* ── RESULTADO ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white items-center justify-center px-6 gap-6">
      {result === "success"
        ? <><div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-[40px] font-bold">€{fmt(String(paidAmount))}</p>
            <p className="text-[22px] font-semibold text-emerald-400 mt-1">¡Cobrado!</p>
            <p className="mt-2 text-[13px] text-white/40">Pago por teléfono confirmado</p>
          </div></>
        : <><div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-500/15">
            <XCircle className="h-14 w-14 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-[22px] font-bold">Pago rechazado</p>
            <p className="mt-1 text-[13px] text-white/40">{error}</p>
          </div></>
      }
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => { setStep("amount"); setRaw("000"); setResult(null); setError(""); }}
          className="flex-1 h-[50px] rounded-2xl bg-white text-[#0a0a0f] font-bold text-[15px]">
          Nuevo cobro
        </button>
        <button onClick={() => router.push("/app/dashboard")}
          className="flex-1 h-[50px] rounded-2xl bg-white/10 text-white font-medium text-[15px]">
          Dashboard
        </button>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, type = "text" }: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 border border-white/8">
      <span className="text-white/30 shrink-0">{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/25 outline-none" />
    </div>
  );
}

/* ─── Wrapper con Elements ───────────────────────────────────────────────── */
export default function VirtualTerminalPage() {
  return (
    <Elements stripe={stripePromise}>
      <MotoForm />
    </Elements>
  );
}
