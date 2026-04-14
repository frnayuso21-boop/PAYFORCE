"use client";
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Dispute = {
  id: string; stripeDisputeId: string; amount: number; currency: string;
  status: string; reason: string; createdAt: string; evidenceDueBy: string | null;
  connectedAccount: { businessName: string; email: string };
  payment: { amount: number; currency: string; stripePaymentIntentId: string };
};

const STATUS_STYLES: Record<string, string> = {
  needs_response:          "bg-red-100 text-red-700",
  NEEDS_RESPONSE:          "bg-red-100 text-red-700",
  under_review:            "bg-amber-100 text-amber-700",
  UNDER_REVIEW:            "bg-amber-100 text-amber-700",
  warning_needs_response:  "bg-orange-100 text-orange-700",
  won:  "bg-emerald-100 text-emerald-700",
  WON:  "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
  LOST: "bg-red-100 text-red-600",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function DisputesPage() {
  const [data,    setData]    = useState<{ disputes: Dispute[]; total: number } | null>(null);
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/disputes?status=${status}&page=${page}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Disputas
          </h1>
          <p className="text-[13px] text-slate-400">Todas las disputas abiertas en la plataforma</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none shadow-sm"
        >
          <option value="">Todos los estados</option>
          <option value="needs_response">Needs Response</option>
          <option value="under_review">Under Review</option>
          <option value="won">Ganadas</option>
          <option value="lost">Perdidas</option>
        </select>
        {data && <span className="text-[13px] text-slate-400">{data.total} disputas</span>}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Merchant</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Motivo</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Importe</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Plazo evidencia</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data?.disputes.map((d) => {
                const dueDate  = d.evidenceDueBy ? new Date(d.evidenceDueBy) : null;
                const isUrgent = dueDate && dueDate.getTime() - Date.now() < 3 * 86400_000;
                return (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{d.connectedAccount.businessName}</p>
                      <p className="text-[11px] text-slate-400">{d.connectedAccount.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 capitalize">{d.reason.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-600">{fmt(d.amount)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[d.status] ?? "bg-slate-100 text-slate-400"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right text-[12px] ${isUrgent ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {dueDate
                        ? dueDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                        : "—"}
                      {isUrgent && " ⚠️"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
              {(!data?.disputes.length) && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-300">
                    Sin disputas activas 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
