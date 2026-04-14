"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, RotateCcw, X, AlertTriangle } from "lucide-react";

type Payment = {
  id: string; amount: number; currency: string; status: string;
  applicationFeeAmount: number; description: string | null;
  createdAt: string; stripePaymentIntentId: string; refundedAmount: number;
  connectedAccount: { businessName: string; email: string };
  customer: { name: string; email: string } | null;
  merchantSplit: { platformFee: number; amountToPayMerchant: number } | null;
};

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED:  "bg-emerald-100 text-emerald-700",
  FAILED:     "bg-red-100 text-red-600",
  PROCESSING: "bg-blue-100 text-blue-600",
  CANCELED:   "bg-slate-100 text-slate-500",
  succeeded:  "bg-emerald-100 text-emerald-700",
  failed:     "bg-red-100 text-red-600",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

const STATUSES = ["", "SUCCEEDED", "FAILED", "PROCESSING", "CANCELED", "succeeded", "failed"];
const REASONS  = [
  { value: "requested_by_customer", label: "Solicitado por el cliente" },
  { value: "duplicate",             label: "Pago duplicado" },
  { value: "fraudulent",            label: "Fraude" },
];

/* ── Modal de reembolso ─────────────────────────────────────────────────── */
function RefundModal({
  payment,
  onClose,
  onDone,
}: {
  payment: Payment;
  onClose: () => void;
  onDone: () => void;
}) {
  const remaining   = payment.amount - (payment.refundedAmount ?? 0);
  const [type,      setType]    = useState<"full" | "partial">("full");
  const [amountStr, setAmount]  = useState("");
  const [reason,    setReason]  = useState("requested_by_customer");
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState("");
  const [done,      setDone]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let cents: number | undefined;
    if (type === "partial") {
      const parsed = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
      if (isNaN(parsed) || parsed <= 0) { setError("Introduce un importe válido"); return; }
      if (parsed > remaining)           { setError(`El máximo es ${fmt(remaining)}`); return; }
      cents = parsed;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments/refund", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          payment_intent_id: payment.stripePaymentIntentId,
          ...(cents ? { amount: cents } : {}),
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al procesar el reembolso"); return; }
      setDone(true);
      setTimeout(() => { onDone(); }, 1500);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <RotateCcw className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-900">Emitir reembolso</h2>
              <p className="text-[11px] text-slate-400">{payment.connectedAccount.businessName || payment.connectedAccount.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-12 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-slate-900">Reembolso emitido</p>
            <p className="text-[13px] text-slate-400 text-center">Stripe procesará el reembolso en 5–10 días hábiles.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Resumen del pago */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Importe cobrado</span>
                <span className="font-semibold text-slate-900">{fmt(payment.amount)}</span>
              </div>
              {payment.refundedAmount > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500">Ya reembolsado</span>
                  <span className="text-red-500 font-medium">−{fmt(payment.refundedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-700 font-medium">Disponible para reembolso</span>
                <span className="font-bold text-slate-900">{fmt(remaining)}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5 font-mono">{payment.stripePaymentIntentId}</p>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Tipo de reembolso</label>
              <div className="grid grid-cols-2 gap-2">
                {([["full", "Reembolso total"], ["partial", "Reembolso parcial"]] as const).map(([v, l]) => (
                  <button
                    key={v} type="button"
                    onClick={() => setType(v)}
                    className={`rounded-xl border px-4 py-2.5 text-[13px] font-medium transition ${
                      type === v
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Importe parcial */}
            {type === "partial" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Importe a reembolsar (€)</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <span className="text-slate-400 text-[14px]">€</span>
                  <input
                    type="number" step="0.01" min="0.01"
                    max={(remaining / 100).toFixed(2)}
                    value={amountStr}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Máx. ${(remaining / 100).toFixed(2)}`}
                    className="flex-1 text-[14px] outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Motivo</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {/* Aviso */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Este reembolso se ejecutará inmediatamente en Stripe. La transferencia al merchant se revertirá y la comisión de plataforma también se devolverá.
            </p>

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 transition disabled:opacity-50">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {loading ? "Procesando…" : "Confirmar reembolso"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function PaymentsPage() {
  const [data,      setData]      = useState<{ payments: Payment[]; total: number } | null>(null);
  const [q,         setQ]         = useState("");
  const [status,    setStatus]    = useState("");
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [refunding, setRefunding] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, status, page: String(page) });
      const r = await fetch(`/api/admin/payments?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      {refunding && (
        <RefundModal
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => { setRefunding(null); load(); }}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Pagos</h1>
          <p className="text-[13px] text-slate-400">Todos los pagos de la plataforma</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por PI, email de cliente…"
            className="flex-1 text-[13px] outline-none placeholder:text-slate-300"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none shadow-sm"
        >
          <option value="">Todos los estados</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {data && <span className="text-[13px] text-slate-400 shrink-0">{data.total} pagos</span>}
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
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cliente</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Importe</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Comisión</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.payments.map((p) => {
                const refunded   = p.refundedAmount ?? 0;
                const remaining  = p.amount - refunded;
                const canRefund  = p.status === "SUCCEEDED" && remaining > 0;
                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{p.connectedAccount.businessName || p.connectedAccount.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {p.customer ? (
                        <div>
                          <p className="text-slate-700">{p.customer.name}</p>
                          <p className="text-[11px] text-slate-400">{p.customer.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px]">{p.stripePaymentIntentId}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {fmt(p.amount)}
                      {refunded > 0 && (
                        <span className="block text-[10px] text-red-400">−{fmt(refunded)} dev.</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-blue-600 font-medium">
                      {p.merchantSplit ? fmt(p.merchantSplit.platformFee) : fmt(p.applicationFeeAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-400"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canRefund ? (
                        <button
                          onClick={() => setRefunding(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reembolsar
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">
                          {refunded >= p.amount ? "Dev. total" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!data?.payments.length) && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-300">Sin pagos</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 25 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-slate-50 transition">
            ← Anterior
          </button>
          <span className="text-[13px] text-slate-400">Página {page} de {Math.ceil(data.total / 25)}</span>
          <button disabled={page * 25 >= data.total} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-slate-50 transition">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
