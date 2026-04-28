"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard, RefreshCw, Search, ArrowUpRight,
  CheckCircle2, XCircle, Clock, RotateCcw, ChevronRight,
  X, AlertTriangle, Loader2,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Payment = {
  id:             string;
  amount:         number;
  amountRefunded: number;
  currency:       string;
  status:         string;
  description:    string | null;
  customerEmail:  string | null;
  customerName:   string | null;
  created:        number;
  fee:            number;
  net:            number;
  refunded:       boolean;
  paymentIntentId: string | null;
};

type FilterKey = "all" | "succeeded" | "failed" | "refunded";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency", currency: currency.toUpperCase(),
  });
}

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Status Badge ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; icon: React.ReactNode;
  bg: string; text: string;
}> = {
  succeeded: {
    label: "Exitoso",
    icon:  <CheckCircle2 className="h-3 w-3" />,
    bg: "#EAF3DE", text: "#27500A",
  },
  pending: {
    label: "Pendiente",
    icon:  <Clock className="h-3 w-3" />,
    bg: "#FEF3C7", text: "#92400E",
  },
  failed: {
    label: "Fallido",
    icon:  <XCircle className="h-3 w-3" />,
    bg: "#FEE2E2", text: "#991B1B",
  },
  refunded: {
    label: "Reembolsado",
    icon:  <RotateCcw className="h-3 w-3" />,
    bg: "#EFF6FF", text: "#1D4ED8",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, bg: "#F1F5F9", text: "#475569" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ── Mini modal de reembolso rápido ──────────────────────────────────────────
const REFUND_REASONS = [
  { value: "requested_by_customer", label: "Solicitado por el cliente" },
  { value: "duplicate",             label: "Duplicado"                 },
  { value: "fraudulent",            label: "Fraude"                    },
];

function QuickRefundModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const [reason,   setReason]   = useState("requested_by_customer");
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConfirm() {
    setErrorMsg("");
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/payments/${payment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json();
      if (!r.ok) { setErrorMsg(d.error ?? "Error al reembolsar."); return; }
      onSuccess(payment.id);
      onClose();
    } catch {
      setErrorMsg("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900">Reembolsar pago</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[12px] text-slate-500">{payment.description ?? payment.id}</p>
            <p className="text-[14px] font-semibold text-slate-800">
              {fmt(payment.amount, payment.currency)}
              {payment.customerEmail && <span className="ml-1.5 font-normal text-slate-400">· {payment.customerEmail}</span>}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-slate-600">Motivo</p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition"
            >
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700">
              Las comisiones de procesamiento no son reembolsables. PayForce retiene su comisión.
              Solo se devolverá el importe neto al cliente.
            </p>
          </div>
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-[12px] text-red-700">{errorMsg}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60 transition-colors"
            style={{ background: "#991B1B" }}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar reembolso
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "Todos"        },
  { key: "succeeded", label: "Exitosos"     },
  { key: "failed",    label: "Fallidos"     },
  { key: "refunded",  label: "Reembolsados" },
];

// ── Página ─────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [payments,      setPayments]      = useState<Payment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<FilterKey>("all");
  const [search,        setSearch]        = useState("");
  const [refundTarget,  setRefundTarget]  = useState<Payment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/dashboard/payments?limit=100&status=${filter}`)
      .then((r) => (r.ok ? r.json() : { payments: [] }))
      .then((d) => setPayments(d.payments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const visible = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q) ||
      (p.customerEmail ?? "").toLowerCase().includes(q) ||
      (p.customerName  ?? "").toLowerCase().includes(q) ||
      (p.paymentIntentId ?? "").toLowerCase().includes(q)
    );
  });

  const totalAmount = visible.reduce((s, p) => s + p.amount, 0);

  function handleRefundSuccess(id: string) {
    setPayments((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "refunded", refunded: true } : p)
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-400" />
            Transacciones
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Historial completo de cobros y pagos
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition px-3 py-1.5 rounded-lg border border-slate-200"
          style={{ borderColor: "#E5E7EB" }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {/* Filtros + Búsqueda */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "#E5E7EB" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition"
              style={{
                background:  filter === f.key ? "#1e293b" : "transparent",
                color:       filter === f.key ? "#fff"     : "#64748b",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, descripción, ID…"
            className="w-full rounded-lg border pl-9 pr-4 py-2 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
            style={{ borderColor: "#E5E7EB" }}
          />
        </div>

        {visible.length > 0 && (
          <span className="ml-auto text-[12px] text-slate-400">
            {visible.length} cobro{visible.length !== 1 ? "s" : ""} · {fmt(totalAmount)}
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
        {/* Cabecera */}
        <div className="grid bg-slate-50 border-b text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3"
          style={{ borderColor: "#E5E7EB", gridTemplateColumns: "1.6fr 1fr 2fr 1.5fr 1.2fr 1fr 1fr 100px 24px" }}>
          <span>Importe</span>
          <span>Estado</span>
          <span>Descripción</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span className="text-right">Comisión</span>
          <span className="text-right">Neto</span>
          <span />
          <span />
        </div>

        {loading ? (
          <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid items-center px-5 py-3.5"
                style={{ gridTemplateColumns: "1.6fr 1fr 2fr 1.5fr 1.2fr 1fr 1fr 100px 24px" }}
              >
                <div className="h-4 w-20 animate-pulse rounded-md bg-slate-100" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100 ml-auto" />
                <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100 ml-auto" />
                <div />
                <div className="h-4 w-4 animate-pulse rounded bg-slate-100 ml-auto" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
            <CreditCard className="h-10 w-10" />
            <p className="text-[13px]">Sin transacciones</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
            {visible.map((p) => (
              <div
                key={p.id}
                className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition group"
                style={{ gridTemplateColumns: "1.6fr 1fr 2fr 1.5fr 1.2fr 1fr 1fr 100px 24px" }}
              >
                {/* Importe */}
                <Link href={`/app/payments/${p.id}`} className="contents">
                  <span
                    className="text-[14px] font-semibold tabular-nums"
                    style={{
                      color: p.status === "succeeded" ? "#166534"
                           : p.status === "failed"    ? "#991B1B"
                           : "#475569",
                    }}
                  >
                    {fmt(p.amount, p.currency)}
                  </span>
                </Link>

                {/* Estado */}
                <Link href={`/app/payments/${p.id}`} className="contents">
                  <StatusBadge status={p.status} />
                </Link>

                {/* Descripción */}
                <Link href={`/app/payments/${p.id}`}
                  className="text-[12px] text-slate-500 truncate pr-4">
                  {p.description ?? "—"}
                </Link>

                {/* Cliente */}
                <Link href={`/app/payments/${p.id}`} className="min-w-0 block">
                  {p.customerName && (
                    <p className="text-[12px] font-medium text-slate-700 truncate">{p.customerName}</p>
                  )}
                  {p.customerEmail && (
                    <p className="text-[11px] text-slate-400 truncate">{p.customerEmail}</p>
                  )}
                  {!p.customerName && !p.customerEmail && (
                    <span className="text-[12px] text-slate-300">—</span>
                  )}
                </Link>

                {/* Fecha */}
                <Link href={`/app/payments/${p.id}`} className="block">
                  <p className="text-[12px] text-slate-600">{fmtDate(p.created)}</p>
                  <p className="text-[11px] text-slate-400">{fmtTime(p.created)}</p>
                </Link>

                {/* Comisión */}
                <Link href={`/app/payments/${p.id}`}
                  className="text-[12px] text-slate-400 text-right tabular-nums block">
                  {p.fee > 0 ? `−${fmt(p.fee, p.currency)}` : "—"}
                </Link>

                {/* Neto */}
                <Link href={`/app/payments/${p.id}`}
                  className="text-[12px] font-medium text-slate-700 text-right tabular-nums block">
                  {fmt(p.net, p.currency)}
                </Link>

                {/* Botón reembolsar */}
                <div className="flex justify-center">
                  {p.status === "succeeded" && !p.refunded ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRefundTarget(p); }}
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#991B1B",
                        background: "#FEE2E2",
                        border: "0.5px solid #FECACA",
                        padding: "4px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Reembolsar
                    </button>
                  ) : null}
                </div>

                {/* Flecha */}
                <Link href={`/app/payments/${p.id}`} className="contents">
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition justify-self-end" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal reembolso rápido */}
      {refundTarget && (
        <QuickRefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
}
