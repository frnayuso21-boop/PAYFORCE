"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, RefreshCw as SubIcon } from "lucide-react";

type Subscription = {
  id: string; status: string; current_period_end: number;
  customer: string; items: { data: { price: { unit_amount: number | null; currency: string; recurring: { interval: string }; product: string } }[] };
  metadata: { merchantUserId?: string; priceType?: string };
};

function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: currency.toUpperCase() });
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  trialing:  "bg-blue-100 text-blue-600",
  past_due:  "bg-amber-100 text-amber-700",
  canceled:  "bg-slate-100 text-slate-500",
  unpaid:    "bg-red-100 text-red-600",
};

export default function AdminSubscriptionsPage() {
  const [subs,    setSubs]    = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/subscriptions");
      if (r.ok) {
        const d = await r.json();
        setSubs(d.subscriptions ?? []);
      } else {
        setError("Error cargando suscripciones");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
            <SubIcon className="h-5 w-5 text-blue-500" />
            Suscripciones
          </h1>
          <p className="text-[13px] text-slate-400">Todas las suscripciones activas en Stripe</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">ID Stripe</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cliente</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Importe</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Intervalo</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Próximo cobro</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const price = s.items.data[0]?.price;
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{s.id}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">{s.customer}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {price?.unit_amount
                        ? fmt(price.unit_amount, price.currency)
                        : <span className="text-slate-400 font-normal">Variable</span>}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-500 capitalize">
                      {price?.recurring?.interval ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        s.metadata.priceType === "variable"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {s.metadata.priceType ?? "fixed"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[s.status] ?? "bg-slate-100 text-slate-400"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400">
                      {new Date(s.current_period_end * 1000).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
              {subs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-300">Sin suscripciones activas</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
