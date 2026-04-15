"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Lock } from "lucide-react";

interface CheckoutButtonProps {
  plan:     string;
  planName: string;
}

export function CheckoutButton({ plan, planName }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo iniciar el proceso de pago.");
        setLoading(false);
        return;
      }
      // Redirigir a Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</>
        ) : (
          <>
            Empezar prueba de 14 días — {planName}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3 text-slate-300" />
        <span className="text-[11px] text-slate-400">Pago seguro · Cancela en cualquier momento</span>
      </div>
    </div>
  );
}
