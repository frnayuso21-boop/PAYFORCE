"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock, CreditCard, ChevronLeft, CheckCircle2, ChevronDown } from "lucide-react";

const DEMO = {
  merchant:    "PayForce",
  product:     "Plan Pro",
  description: "Suscripción mensual · acceso completo",
  amount:      4900,   // €49,00/mes
  currency:    "EUR",
  email:       "",
};

const IVA_PCT  = 0.21;
const SUBTOTAL = Math.round(DEMO.amount / (1 + IVA_PCT));
const IVA      = DEMO.amount - SUBTOTAL;

function fmt(cents: number, decimals = true) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: decimals ? 2 : 0,
  }).format(cents / 100);
}

type Step = "idle" | "processing" | "success";

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
}

/* ── Éxito ──────────────────────────────────────────────────────────────── */
function SuccessScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-16 text-center">
      <Image src="/logo-payforce.png" alt="PayForce" width={140} height={32} className="h-7 w-auto" />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-8 w-8 text-green-600" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[13px] font-medium uppercase tracking-[3px] text-green-600">Pago completado</p>
        <p className="mt-3 text-4xl font-light text-gray-900" style={{ letterSpacing: "-0.03em" }}>
          {fmt(DEMO.amount)}
        </p>
        <p className="mt-1.5 text-sm text-gray-400">{DEMO.description}</p>
      </div>
      <div className="w-full max-w-xs divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 text-[13px]">
        <div className="flex justify-between bg-white px-4 py-3 text-gray-500">
          <span>Subtotal</span><span>{fmt(SUBTOTAL)}</span>
        </div>
        <div className="flex justify-between bg-white px-4 py-3 text-gray-500">
          <span>IVA (21%)</span><span>{fmt(IVA)}</span>
        </div>
        <div className="flex justify-between bg-white px-4 py-3 font-semibold text-gray-800">
          <span>Total pagado</span><span>{fmt(DEMO.amount)}</span>
        </div>
      </div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Volver al inicio
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function DemoPaymentPage() {
  const [step,    setStep]    = useState<Step>("idle");
  const [email,   setEmail]   = useState(DEMO.email);
  const [cardNum, setCardNum] = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [cvv,     setCvv]     = useState("");
  const [name,    setName]    = useState("");
  const [annual,  setAnnual]  = useState(false);

  const fmtCard   = (v: string) => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExpiry = (v: string) => { const d = v.replace(/\D/g,"").slice(0,4); return d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  const displayAmount = annual ? Math.round(DEMO.amount * 12 * 0.8) : DEMO.amount;
  const displaySub    = Math.round(displayAmount / (1 + IVA_PCT));
  const displayIva    = displayAmount - displaySub;

  const ready = step === "idle";

  const pay = () => { setStep("processing"); setTimeout(() => setStep("success"), 2500); };
  const reset = () => { setStep("idle"); setCardNum(""); setExpiry(""); setCvv(""); setName(""); setEmail(""); };

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ══ PANEL IZQUIERDO — oscuro ════════════════════════════════════ */}
      <div className="relative flex w-full flex-col md:w-[45%] lg:w-[42%]"
        style={{ background: "#30313D", minHeight: "100vh" }}>

        {/* Back */}
        <div className="px-10 pt-10">
          <button className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            <ChevronLeft className="h-4 w-4" />
            Volver
          </button>
        </div>

        {/* Logo */}
        <div className="mt-8 px-10">
          <div className="inline-flex items-center rounded-xl bg-white px-4 py-2.5">
            <Image
              src="/logo-payforce.png"
              alt="PayForce"
              width={160}
              height={36}
              priority
              className="h-7 w-auto"
            />
          </div>
        </div>

        {/* Producto + precio */}
        <div className="mt-8 px-10">
          <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.55)" }}>{DEMO.product}</p>
          <p className="mt-1 text-[42px] font-light text-white tabular-nums" style={{ letterSpacing: "-0.03em" }}>
            {fmt(displayAmount)}
            <span className="ml-2 text-[18px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              / {annual ? "año" : "mes"}
            </span>
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>{DEMO.description}</p>
        </div>

        {/* Toggle anual */}
        <div className="mx-10 mt-6 flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-[13px] text-white">Facturación anual</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              {annual ? "Ahorro del 20% aplicado" : `Ahorra ${fmt(Math.round(DEMO.amount * 12 * 0.2))} al año`}
            </p>
          </div>
          <button onClick={() => setAnnual(!annual)}
            className="relative h-6 w-11 rounded-full transition-colors"
            style={{ background: annual ? "#0DDFC8" : "rgba(255,255,255,0.20)" }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              style={{ left: annual ? "calc(100% - 22px)" : "2px" }} />
          </button>
        </div>

        {/* Desglose */}
        <div className="mx-10 mt-6 space-y-2 text-[13px]">
          <div className="flex justify-between" style={{ color: "rgba(255,255,255,0.50)" }}>
            <span>{DEMO.product} × 1</span>
            <span className="tabular-nums">{fmt(displaySub)}</span>
          </div>
          <div className="flex justify-between" style={{ color: "rgba(255,255,255,0.50)" }}>
            <span>IVA (21%)</span>
            <span className="tabular-nums">{fmt(displayIva)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold text-white"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            <span>Total a pagar hoy</span>
            <span className="tabular-nums">{fmt(displayAmount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto px-10 pb-10 pt-16">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            Powered by <span className="font-semibold">PayForce</span>
          </p>
          <div className="mt-2 flex gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            <span className="cursor-pointer hover:opacity-60">Condiciones</span>
            <span className="cursor-pointer hover:opacity-60">Privacidad</span>
          </div>
        </div>
      </div>

      {/* ══ PANEL DERECHO — blanco ══════════════════════════════════════ */}
      <div className="flex flex-1 flex-col bg-white">
        {step === "success" ? (
          <SuccessScreen onBack={reset} />
        ) : (
          <div className="flex flex-1 flex-col justify-center px-10 py-16 lg:px-16">
            <div className="mx-auto w-full max-w-sm">

              {/* Información de contacto */}
              <div className="mb-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-gray-500">
                  Información de contacto
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors focus-within:border-gray-400">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full px-4 py-3.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div className="mb-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-gray-500">
                  Método de pago
                </p>

                {/* Express — Apple Pay, Google Pay, Link, Klarna */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {/* Apple Pay */}
                  <button onClick={pay}
                    className="flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "#000" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    Apple Pay
                  </button>
                  {/* Google Pay */}
                  <button onClick={pay}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-[14px] font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
                    style={{ background: "#fff" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google Pay
                  </button>
                  {/* Klarna */}
                  <button onClick={pay}
                    className="flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-gray-900 transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "#FFB3C7" }}>
                    <svg viewBox="0 0 60 24" width="44" height="18">
                      <text x="0" y="18" fontFamily="Arial Black, sans-serif" fontSize="16" fontWeight="900" fill="#17120f">klarna</text>
                    </svg>
                  </button>
                  {/* Link */}
                  <button onClick={pay}
                    className="flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "#00D66B" }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="white"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                    Link
                  </button>
                </div>

                {/* Divider */}
                <div className="relative mb-4 flex items-center">
                  <div className="flex-1 border-t border-gray-100" />
                  <span className="mx-3 text-[11px] text-gray-400">o paga con tarjeta</span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                {/* Campos tarjeta — agrupados como Stripe */}
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Nombre del titular"
                    className="w-full border-b border-gray-200 px-4 py-3.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <div className="relative">
                    <input
                      value={cardNum} onChange={e => setCardNum(fmtCard(e.target.value))}
                      placeholder="Número de tarjeta"
                      className="w-full border-b border-gray-200 px-4 py-3.5 pr-12 font-mono text-[14px] text-gray-900 outline-none placeholder:font-sans placeholder:text-gray-400"
                    />
                    <CreditCard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                  </div>
                  <div className="flex">
                    <input
                      value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))}
                      placeholder="MM/AA"
                      className="w-1/2 border-r border-gray-200 px-4 py-3.5 font-mono text-[14px] text-gray-900 outline-none placeholder:font-sans placeholder:text-gray-400"
                    />
                    <input
                      value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,3))}
                      placeholder="CVV" type="password"
                      className="w-1/2 px-4 py-3.5 font-mono text-[14px] text-gray-900 outline-none placeholder:font-sans placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={pay}
                disabled={!ready}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                style={{ background: "#0A2540" }}
              >
                {step === "processing" ? (
                  <><Spinner /> Procesando…</>
                ) : (
                  <><Lock className="h-4 w-4" /> Pagar y suscribirse</>
                )}
              </button>

              <p className="mt-4 text-center text-[11px] text-gray-400">
                Al suscribirte autorizas el cobro de{" "}
                <strong>{fmt(displayAmount)}</strong> {annual ? "al año" : "al mes"} hasta que canceles.
              </p>

              <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-gray-300">
                <Lock className="h-3 w-3" />
                Powered by <span className="ml-1 font-semibold text-gray-400">PayForce</span>
                &nbsp;·&nbsp;Condiciones&nbsp;·&nbsp;Privacidad
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
