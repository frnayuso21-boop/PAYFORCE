"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

type PayoutRequest = {
  id: string; requestedAmount: number; fee: number; netAmount: number;
  currency: string; status: string; iban: string | null; accountHolder: string | null;
  notes: string | null; stripePayoutId: string | null;
  createdAt: string; processedAt: string | null;
  connectedAccount: {
    businessName: string; email: string;
    user: { email: string; name: string } | null;
  };
};

const STATUS = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "ALL"];
const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-600",
  COMPLETED:  "bg-emerald-100 text-emerald-700",
  FAILED:     "bg-red-100 text-red-600",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function AdminPayoutsPage() {
  const [data,     setData]     = useState<{ requests: PayoutRequest[]; total: number } | null>(null);
  const [filter,   setFilter]   = useState("PENDING");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<PayoutRequest | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [notes,    setNotes]    = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/payouts?status=${filter}&page=${page}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes, stripePayoutId: payoutRef || undefined }),
      });
      if (r.ok) {
        setSelected(null);
        setNotes("");
        setPayoutRef("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Instant Payouts
          </h1>
          <p className="text-[13px] text-slate-400">Gestiona las solicitudes de cobro inmediato</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* Filtro de estado */}
      <div className="mb-4 flex items-center gap-2">
        {STATUS.map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
        {data && <span className="ml-auto text-[13px] text-slate-400">{data.total} solicitudes</span>}
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
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">IBAN</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Solicitado</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Comisión 1.5%</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Neto a pagar</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{r.connectedAccount.businessName || r.connectedAccount.email}</p>
                    <p className="text-[11px] text-slate-400">{r.accountHolder || r.connectedAccount.user?.name || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-slate-600">
                    {r.iban ? `${r.iban.slice(0, 8)}···${r.iban.slice(-4)}` : <span className="text-slate-300">Sin IBAN</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{fmt(r.requestedAmount)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-500">{fmt(r.fee)}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{fmt(r.netAmount)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-400"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {(r.status === "PENDING" || r.status === "PROCESSING") && (
                      <button
                        onClick={() => { setSelected(r); setNotes(r.notes ?? ""); setPayoutRef(r.stripePayoutId ?? ""); }}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-[12px] text-white hover:bg-slate-700 transition"
                      >
                        Gestionar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.requests.length) && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-300">
                    No hay solicitudes {filter !== "ALL" ? `con estado ${filter}` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 20 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30">← Anterior</button>
          <span className="text-[13px] text-slate-400">Página {page} de {Math.ceil(data.total / 20)}</span>
          <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30">Siguiente →</button>
        </div>
      )}

      {/* Modal de gestión */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
              <p className="font-bold text-slate-900 text-[15px]">Gestionar Instant Payout</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{selected.connectedAccount.businessName}</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Resumen */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitado</span>
                  <span className="font-semibold">{fmt(selected.requestedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Comisión (1.5%)</span>
                  <span className="text-slate-500">−{fmt(selected.fee)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-900">A transferir</span>
                  <span className="font-bold text-emerald-600">{fmt(selected.netAmount)}</span>
                </div>
              </div>

              {/* IBAN completo */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium uppercase">IBAN destino</label>
                <p className="mt-1 font-mono text-[13px] bg-slate-50 rounded-lg px-3 py-2 select-all">
                  {selected.iban || "No proporcionado"}
                </p>
              </div>

              {/* Referencia transferencia */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium uppercase">Ref. transferencia / ID Stripe</label>
                <input
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="po_xxx o referencia SEPA"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium uppercase">Notas internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones opcionales…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => updateStatus(selected.id, "COMPLETED")}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-[13px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saving ? "Guardando…" : "Marcar como Pagado"}
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "FAILED")}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </button>
              </div>
              <button
                onClick={() => { setSelected(null); setNotes(""); setPayoutRef(""); }}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-[13px] text-slate-500 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
