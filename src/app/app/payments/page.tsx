"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard, RefreshCw, Search, ArrowUpRight,
  CheckCircle2, XCircle, Clock, RotateCcw, ChevronRight,
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

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "Todos"        },
  { key: "succeeded", label: "Exitosos"     },
  { key: "failed",    label: "Fallidos"     },
  { key: "refunded",  label: "Reembolsados" },
];

// ── Página ─────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterKey>("all");
  const [search,   setSearch]   = useState("");

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
          style={{ borderColor: "#E5E7EB", gridTemplateColumns: "1.6fr 1fr 2fr 1.5fr 1.2fr 1fr 1fr 24px" }}>
          <span>Importe</span>
          <span>Estado</span>
          <span>Descripción</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span className="text-right">Comisión</span>
          <span className="text-right">Neto</span>
          <span />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
            <CreditCard className="h-10 w-10" />
            <p className="text-[13px]">Sin transacciones</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
            {visible.map((p) => (
              <Link
                key={p.id}
                href={`/app/payments/${p.id}`}
                className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition group cursor-pointer"
                style={{ gridTemplateColumns: "1.6fr 1fr 2fr 1.5fr 1.2fr 1fr 1fr 24px" }}
              >
                {/* Importe */}
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

                {/* Estado */}
                <StatusBadge status={p.status} />

                {/* Descripción */}
                <span className="text-[12px] text-slate-500 truncate pr-4">
                  {p.description ?? "—"}
                </span>

                {/* Cliente */}
                <div className="min-w-0">
                  {p.customerName && (
                    <p className="text-[12px] font-medium text-slate-700 truncate">{p.customerName}</p>
                  )}
                  {p.customerEmail && (
                    <p className="text-[11px] text-slate-400 truncate">{p.customerEmail}</p>
                  )}
                  {!p.customerName && !p.customerEmail && (
                    <span className="text-[12px] text-slate-300">—</span>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <p className="text-[12px] text-slate-600">{fmtDate(p.created)}</p>
                  <p className="text-[11px] text-slate-400">{fmtTime(p.created)}</p>
                </div>

                {/* Comisión */}
                <span className="text-[12px] text-slate-400 text-right tabular-nums">
                  {p.fee > 0 ? `−${fmt(p.fee, p.currency)}` : "—"}
                </span>

                {/* Neto */}
                <span className="text-[12px] font-medium text-slate-700 text-right tabular-nums">
                  {fmt(p.net, p.currency)}
                </span>

                {/* Flecha */}
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition justify-self-end" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
