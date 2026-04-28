"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Zap, ArrowUpRight, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2,
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type Transfer = {
  id: string; date: string; amount: number; currency: string;
  status: string; destination: string | null; description: string | null;
};
type BalanceData = {
  available: number; pending: number; thisMonth: number;
  grossVolume: number; netVolume: number; totalFees: number;
  transfers: Transfer[]; currency: string;
};

function Sk({ w = "w-24", h = "h-6" }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded-[6px] bg-[#F3F4F6] animate-pulse`} />;
}

const STATUS_DOT: Record<string, string> = {
  paid: "bg-[#22C55E]", failed: "bg-[#EF4444]",
  pending: "bg-[#9CA3AF]", processing: "bg-[#9CA3AF]",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Pagado", failed: "Fallido", pending: "Pendiente", processing: "Procesando",
};

export default function BalancesPage() {
  const [data,          setData]          = useState<BalanceData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg,     setPayoutMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/dashboard/balance")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleInstantPayout = async () => {
    setPayoutLoading(true); setPayoutMsg(null);
    try {
      const r = await fetch("/api/payouts/instant", { method: "POST" });
      const d = await r.json();
      setPayoutMsg({ ok: r.ok, text: d.message ?? (r.ok ? "Transferencia iniciada." : d.error ?? "Error al solicitar.") });
      if (r.ok) load();
    } catch {
      setPayoutMsg({ ok: false, text: "Error de red." });
    } finally { setPayoutLoading(false); }
  };

  const available   = data?.available   ?? 0;
  const pending     = data?.pending     ?? 0;
  const thisMonth   = data?.thisMonth   ?? 0;
  const grossVolume = data?.grossVolume ?? 0;
  const netVolume   = data?.netVolume   ?? 0;
  const totalFees   = data?.totalFees   ?? 0;
  const currency    = data?.currency    ?? "eur";
  const transfers   = data?.transfers   ?? [];

  const feeRate = grossVolume > 0 ? ((totalFees / grossVolume) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-full bg-[#F9FAFB] p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#0A0A0A]">Saldos</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Resumen financiero de tu cuenta</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] text-[#6B7280] hover:bg-[#F9FAFB] transition">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Feedback payout */}
      {payoutMsg && (
        <div className={`mb-5 flex items-center gap-3 rounded-[10px] border px-4 py-3 text-[13px] font-medium ${
          payoutMsg.ok
            ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
            : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
        }`}>
          {payoutMsg.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle      className="h-4 w-4 shrink-0" />}
          {payoutMsg.text}
        </div>
      )}

      {/* ── Saldo disponible + Instant Payout ──────────────────────────────── */}
      <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-2">
              SALDO DISPONIBLE
            </p>
            {loading
              ? <Sk h="h-10" w="w-40" />
              : <p className="text-[40px] font-semibold tracking-[-1.5px] text-[#0A0A0A] leading-none tabular-nums">
                  {fmt(available, currency)}
                </p>}
            <p className="text-[12px] text-[#9CA3AF] mt-2">Listo para retirar ahora</p>
          </div>

          <button
            onClick={handleInstantPayout}
            disabled={payoutLoading || available === 0}
            className="flex items-center gap-2 rounded-[10px] bg-[#0A0A0A] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {payoutLoading
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />}
            {payoutLoading ? "Procesando…" : "Instant Payout"}
          </button>
        </div>

        {/* En tránsito */}
        {pending > 0 && (
          <div className="mt-5 pt-5 border-t border-[#F3F4F6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#9CA3AF]" />
              <p className="text-[13px] text-[#6B7280]">En tránsito (llegará en 2–5 días)</p>
            </div>
            {loading ? <Sk h="h-4" w="w-20" /> : <p className="text-[13px] font-semibold text-[#0A0A0A] tabular-nums">{fmt(pending, currency)}</p>}
          </div>
        )}
      </div>

      {/* ── KPI financieros ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          {
            label: "VOLUMEN BRUTO",
            value: fmt(grossVolume, currency),
            sub:   "Total cobrado histórico",
            icon:  <TrendingUp className="h-4 w-4 text-[#9CA3AF]" />,
          },
          {
            label: "NETO RECIBIDO",
            value: fmt(netVolume, currency),
            sub:   "Bruto menos comisiones",
            icon:  <ArrowUpRight className="h-4 w-4 text-[#9CA3AF]" />,
          },
          {
            label: "COMISIONES TOTALES",
            value: fmt(totalFees, currency),
            sub:   `${feeRate}% del volumen bruto`,
            icon:  <Zap className="h-4 w-4 text-[#9CA3AF]" />,
          },
          {
            label: "ESTE MES",
            value: fmt(thisMonth, currency),
            sub:   new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
            icon:  <Clock className="h-4 w-4 text-[#9CA3AF]" />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-[10px] border border-[#E5E7EB] bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]">{c.label}</p>
              {c.icon}
            </div>
            {loading
              ? <Sk h="h-7" w="w-28" />
              : <p className="text-[22px] font-semibold tracking-[-0.5px] text-[#0A0A0A] tabular-nums leading-none">{c.value}</p>}
            <p className="text-[11px] text-[#9CA3AF] mt-1.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Historial de movimientos ───────────────────────────────────────── */}
      <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#E5E7EB]">
          <p className="text-[13px] font-semibold text-[#0A0A0A]">Historial de movimientos</p>
          <p className="text-[11px] text-[#9CA3AF]">{transfers.length} transferencia{transfers.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="divide-y divide-[#F3F4F6]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#F3F4F6] animate-pulse" />
                  <div className="space-y-1.5">
                    <Sk h="h-3.5" w="w-40" />
                    <Sk h="h-3"   w="w-24" />
                  </div>
                </div>
                <Sk h="h-4" w="w-16" />
              </div>
            ))}
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[13px] text-[#9CA3AF]">Sin movimientos todavía</p>
            <p className="text-[11px] text-[#9CA3AF]">Las transferencias aparecerán aquí cuando proceses pagos</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {transfers.map((t) => {
              const dotCls = STATUS_DOT[t.status]   ?? "bg-[#9CA3AF]";
              const label  = STATUS_LABEL[t.status] ?? t.status;
              const isPending = t.status === "pending" || t.status === "processing";
              return (
                <div key={t.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${dotCls}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#0A0A0A] truncate">
                        {t.description ?? t.destination ?? t.id.slice(0, 20)}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {fmtDate(t.date)}
                        {isPending && <span className="ml-2 text-[#6B7280]">· {label}</span>}
                      </p>
                    </div>
                  </div>
                  <p className={`text-[14px] font-medium tabular-nums shrink-0 ml-4 ${t.status === "failed" ? "text-[#9CA3AF] line-through" : "text-[#0A0A0A]"}`}>
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
