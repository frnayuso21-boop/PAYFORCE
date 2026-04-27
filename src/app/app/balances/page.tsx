"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";

function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

type Transfer = {
  id:          string;
  date:        string;
  amount:      number;
  currency:    string;
  status:      string;
  destination: string | null;
  description: string | null;
};

type BalanceData = {
  available: number;
  pending:   number;
  thisMonth: number;
  transfers: Transfer[];
  currency:  string;
};

const STATUS_LABEL: Record<string, string> = {
  paid:       "Pagado",
  pending:    "Pendiente",
  processing: "Procesando",
  failed:     "Fallido",
};

function Skeleton({ w = "w-24", h = "h-5" }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded-md bg-[#f0f0f0] animate-pulse`} />;
}

export default function BalancesPage() {
  const [data,         setData]         = useState<BalanceData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [payoutLoading,setPayoutLoading]= useState(false);
  const [payoutMsg,    setPayoutMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/dashboard/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePayout = async () => {
    setPayoutLoading(true);
    setPayoutMsg(null);
    try {
      const r = await fetch("/api/payouts/instant", { method: "POST" });
      const d = await r.json();
      setPayoutMsg({
        ok:   r.ok,
        text: d.message ?? (r.ok ? "Solicitud registrada." : d.error ?? "Error al solicitar."),
      });
      if (r.ok) load();
    } catch {
      setPayoutMsg({ ok: false, text: "Error de red." });
    } finally {
      setPayoutLoading(false);
    }
  };

  const available = data?.available ?? 0;
  const pending   = data?.pending   ?? 0;
  const thisMonth = data?.thisMonth ?? 0;
  const currency  = data?.currency  ?? "eur";
  const transfers = data?.transfers ?? [];

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-10 md:px-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
          Saldos
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[#6e6e73] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#f5f5f7] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          {available > 0 && (
            <button
              onClick={handlePayout}
              disabled={payoutLoading}
              className="flex items-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:bg-[#0077ed] transition-colors disabled:opacity-50"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {payoutLoading ? "Procesando…" : "Transferir fondos"}
            </button>
          )}
        </div>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      {payoutMsg && (
        <div className={`mb-6 rounded-2xl px-5 py-3.5 text-[13px] font-medium ${
          payoutMsg.ok
            ? "bg-white text-[#1d7a3a] border border-[#d1f0db]"
            : "bg-white text-[#c0392b] border border-[#fdd]"
        }`}>
          {payoutMsg.text}
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Disponible",   value: available, sub: "Listo para retirar" },
          { label: "En tránsito",  value: pending,   sub: "Llegará en 2–5 días" },
          { label: "Este mes",     value: thisMonth, sub: new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[12px] font-medium text-[#6e6e73] mb-3">{card.label}</p>
            {loading
              ? <Skeleton h="h-8" w="w-36" />
              : <p className="text-[30px] font-semibold tracking-tight text-[#1d1d1f] tabular-nums leading-none">
                  {fmt(card.value, currency)}
                </p>}
            <p className="text-[12px] text-[#aeaeb2] mt-2">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Historial ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#f2f2f2]">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">Historial</p>
          <p className="text-[12px] text-[#aeaeb2]">{transfers.length} movimientos</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-[#f2f2f2] last:border-0">
                <div className="flex flex-col gap-2">
                  <Skeleton h="h-4" w="w-28" />
                  <Skeleton h="h-3" w="w-20" />
                </div>
                <Skeleton h="h-4" w="w-16" />
              </div>
            ))}
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-[17px] font-medium text-[#1d1d1f]">Sin movimientos</p>
            <p className="text-[13px] text-[#aeaeb2]">Las transferencias aparecerán aquí</p>
          </div>
        ) : (
          <div>
            {transfers.map((t, i) => {
              const label = STATUS_LABEL[t.status] ?? t.status;
              const isPending = t.status === "pending" || t.status === "processing";
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-6 py-4 ${i < transfers.length - 1 ? "border-b border-[#f2f2f2]" : ""} hover:bg-[#fafafa] transition-colors`}
                >
                  {/* Left */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Dot */}
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      t.status === "paid"       ? "bg-[#1d7a3a]"
                      : t.status === "failed"   ? "bg-[#c0392b]"
                      : "bg-[#aeaeb2]"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                        {t.description ?? t.destination ?? t.id.slice(0, 20)}
                      </p>
                      <p className="text-[12px] text-[#aeaeb2] mt-0.5">
                        {fmtDate(t.date)}
                        {isPending && (
                          <span className="ml-2 text-[#6e6e73]">· {label}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <p className={`text-[15px] font-medium tabular-nums shrink-0 ml-4 ${
                    t.status === "failed" ? "text-[#aeaeb2] line-through" : "text-[#1d1d1f]"
                  }`}>
                    {fmt(t.amount, t.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
