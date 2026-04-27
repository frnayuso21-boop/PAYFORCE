"use client";
import { useEffect, useState } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Clock } from "lucide-react";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

type Split = {
  id: string; createdAt: string; status: string;
  totalAmount: number; platformFee: number; amountToPayMerchant: number;
  payment: { description: string | null; stripePaymentIntentId: string };
};

export default function BalancesPage() {
  const [splits,  setSplits]  = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/splits")
      .then((r) => {
        if (!r.ok) { setLoading(false); return; }
        return r.json().then((d) => setSplits(d.splits ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const available   = splits.filter((s) => s.status === "paid").reduce((a, s) => a + s.amountToPayMerchant, 0);
  const pending     = splits.filter((s) => s.status === "pending").reduce((a, s) => a + s.amountToPayMerchant, 0);
  const totalFees   = splits.reduce((a, s) => a + s.platformFee, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-slate-400" /> Saldos
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Resumen de tus saldos y movimientos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Disponible</span>
          </div>
          <p className="text-[28px] font-bold text-emerald-600">{fmt(available)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pendiente</span>
          </div>
          <p className="text-[28px] font-bold text-amber-600">{fmt(pending)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Comisiones pagadas</span>
          </div>
          <p className="text-[28px] font-bold text-slate-700">{fmt(totalFees)}</p>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900">Historial de movimientos</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Descripción</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Bruto</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Comisión</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Neto</th>
                <th className="text-center px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Estado</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-6 py-3 text-slate-600 max-w-[200px] truncate">
                    {s.payment.description || s.payment.stripePaymentIntentId}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">{fmt(s.totalAmount)}</td>
                  <td className="px-6 py-3 text-right text-slate-400">−{fmt(s.platformFee)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-emerald-600">{fmt(s.amountToPayMerchant)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      s.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </td>
                </tr>
              ))}
              {splits.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-300">Sin movimientos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
