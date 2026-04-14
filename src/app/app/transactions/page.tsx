"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Layers, Search, RefreshCw, ArrowUpRight } from "lucide-react";

type Payment = {
  id: string; amount: number; currency: string; status: string;
  description: string | null; createdAt: string; stripePaymentIntentId: string;
  refundedAmount: number;
  customer: { name: string; email: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-emerald-100 text-emerald-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  FAILED:    "bg-red-100 text-red-600",
  failed:    "bg-red-100 text-red-600",
  PROCESSING:"bg-blue-100 text-blue-600",
  CANCELED:  "bg-slate-100 text-slate-500",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function TransactionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total,    setTotal]    = useState(0);
  const [q,        setQ]        = useState("");
  const [status,   setStatus]   = useState("");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, status, page: String(page), limit: "30" });
      const r = await fetch(`/api/payments?${params}`);
      if (r.ok) {
        const d = await r.json();
        setPayments(d.payments ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-400" /> Transacciones
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Historial completo de todos tus pagos</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por descripción o cliente…"
            className="flex-1 text-[13px] outline-none placeholder:text-slate-300" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none shadow-sm">
          <option value="">Todos</option>
          <option value="SUCCEEDED">Completados</option>
          <option value="FAILED">Fallidos</option>
          <option value="PROCESSING">En proceso</option>
        </select>
        <span className="text-[13px] text-slate-400 shrink-0">{total} pagos</span>
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
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Descripción</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Importe</th>
                <th className="text-center px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                <th className="px-6 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5">
                    {p.customer ? (
                      <div>
                        <p className="font-medium text-slate-900">{p.customer.name}</p>
                        <p className="text-[11px] text-slate-400">{p.customer.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-[11px] font-mono">{p.stripePaymentIntentId}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-[200px] truncate">{p.description || "—"}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                    {fmt(p.amount)}
                    {p.refundedAmount > 0 && (
                      <span className="block text-[10px] text-red-400">−{fmt(p.refundedAmount)} devuelto</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-400"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3.5">
                    <Link href={`/app/connect/payments`}
                      className="text-slate-300 hover:text-slate-600 transition">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-300">Sin transacciones</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {total > 30 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-white transition">← Anterior</button>
          <span className="text-[13px] text-slate-400">Página {page} de {Math.ceil(total / 30)}</span>
          <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-white transition">Siguiente →</button>
        </div>
      )}
    </div>
  );
}
