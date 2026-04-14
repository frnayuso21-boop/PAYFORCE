"use client";

import { useState, FormEvent } from "react";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

interface Props {
  slug:         string;
  currency:     string;
  primaryColor: string;
}

type Stage = "form" | "loading" | "error";

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: "€", usd: "$", gbp: "£", mxn: "$", cop: "$",
};

function formatCurrencySymbol(currency: string) {
  return CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase();
}

export function StoreCheckout({ slug, currency, primaryColor }: Props) {
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [stage,       setStage]       = useState<Stage>("form");
  const [error,       setError]       = useState<string | null>(null);

  const symbol = formatCurrencySymbol(currency);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount.replace(",", "."));
    if (!amountNum || amountNum < 0.5) {
      setError("El importe mínimo es 0,50 " + currency.toUpperCase());
      return;
    }

    setStage("loading");

    try {
      const res = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount:       Math.round(amountNum * 100),
          currency:     currency.toLowerCase(),
          description:  description || undefined,
          customerName: name || undefined,
          customerEmail: email || undefined,
          storeSlug:    slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al generar el enlace de pago");
        setStage("error");
        return;
      }

      // Redirigir a la página de pago
      window.location.href = data.url as string;
    } catch {
      setError("Error de conexión. Por favor, inténtalo de nuevo.");
      setStage("error");
    }
  }

  const isLoading = stage === "loading";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <p className="text-[17px] font-bold text-slate-900">Realizar pago</p>
        <p className="text-[12px] text-slate-400 mt-0.5">
          Introduce el importe y tus datos para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Importe */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Importe ({currency.toUpperCase()})
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[15px] pointer-events-none">
              {symbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.50"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-3 text-[15px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        {/* Concepto */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Concepto <span className="text-slate-400 font-normal normal-case">(opcional)</span>
          </label>
          <input
            type="text"
            placeholder="Descripción del pago…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Separador datos del cliente */}
        <div className="pt-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Tus datos
          </p>

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="Tu nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent disabled:opacity-50"
            />
            <input
              type="email"
              placeholder="Tu correo electrónico (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
            {error}
          </p>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isLoading || !amount}
          style={isLoading ? {} : { background: primaryColor }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando enlace…
            </>
          ) : (
            <>
              Ir a pagar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Seguridad */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Pago seguro con cifrado SSL · Procesado por Stripe</span>
        </div>
      </form>
    </div>
  );
}
