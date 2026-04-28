"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw, Zap, ArrowUpRight, CheckCircle2, XCircle, Clock, TrendingUp, CreditCard, X, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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
type PayoutInfo = {
  availableCents: number; feeCents: number; netCents: number;
  feeRate: number; instantAvailable: boolean; currency: string;
};
type DebitCard = {
  id: string; brand: string; last4: string; expMonth: number; expYear: number;
};
type InstantStatus = {
  instantAvailable: boolean; cards: DebitCard[];
};

// ── Modal para añadir tarjeta de débito ──────────────────────────────────────
function AddDebitCardModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError(null);

    const cardEl = elements.getElement(CardElement);
    if (!cardEl) { setLoading(false); return; }

    const { token, error: tokenError } = await stripe.createToken(cardEl, { currency: "eur" });
    if (tokenError || !token) {
      setError(tokenError?.message ?? "Error al tokenizar la tarjeta");
      setLoading(false); return;
    }

    const r = await fetch("/api/dashboard/payouts/add-debit-card", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ tokenId: token.id }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Error al añadir la tarjeta"); setLoading(false); return; }
    onSuccess();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-[14px] bg-white border border-[#E5E7EB] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#0A0A0A]" />
            <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Añadir tarjeta de débito</h2>
          </div>
          <button onClick={onClose} className="rounded-[6px] p-1 hover:bg-[#F3F4F6] transition">
            <X className="h-4 w-4 text-[#6B7280]" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Aviso */}
          <div className="flex gap-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] px-4 py-3">
            <AlertCircle className="h-4 w-4 text-[#EA580C] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#9A3412] leading-relaxed">
              Introduce los datos de tu <strong>tarjeta de débito</strong>. Solo las tarjetas de débito
              permiten recibir pagos instantáneos. Las tarjetas de crédito no son válidas.
            </p>
          </div>

          {/* Stripe Card Element */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-2">
              Datos de la tarjeta
            </label>
            <div className="rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3 focus-within:border-[#0A0A0A] transition">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "14px", color: "#0A0A0A", fontFamily: "Inter, sans-serif",
                      "::placeholder": { color: "#9CA3AF" },
                    },
                    invalid: { color: "#EF4444" },
                  },
                }}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2.5">
              <XCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
              <p className="text-[12px] text-[#991B1B]">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[8px] border border-[#E5E7EB] bg-white py-2.5 text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-[8px] bg-[#0A0A0A] py-2.5 text-[13px] font-semibold text-white hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {loading ? "Vinculando…" : "Vincular tarjeta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [data,           setData]           = useState<BalanceData | null>(null);
  const [payoutInfo,     setPayoutInfo]     = useState<PayoutInfo | null>(null);
  const [instantStatus,  setInstantStatus]  = useState<InstantStatus | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [payoutLoading,  setPayoutLoading]  = useState(false);
  const [payoutMsg,      setPayoutMsg]      = useState<{ ok: boolean; method?: string; text: string } | null>(null);
  const [showCardModal,  setShowCardModal]  = useState(false);
  const [deletingCard,   setDeletingCard]   = useState<string | null>(null);
  const [cardMsg,        setCardMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/dashboard/balance").then((r) => r.ok ? r.json() : null),
      fetch("/api/payouts/instant").then((r) => r.ok ? r.json() : null),
      fetch("/api/dashboard/payouts/instant-status").then((r) => r.ok ? r.json() : null),
    ])
      .then(([bal, poi, ist]) => {
        if (bal) setData(bal);
        if (poi) setPayoutInfo(poi);
        if (ist) setInstantStatus(ist);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleInstantPayout = async () => {
    setPayoutLoading(true); setPayoutMsg(null);
    try {
      const r = await fetch("/api/payouts/instant", { method: "POST" });
      const d = await r.json();
      setPayoutMsg({ ok: r.ok, method: d.method, text: d.message ?? (r.ok ? "Transferencia iniciada." : d.error ?? "Error al solicitar.") });
      if (r.ok) load();
    } catch {
      setPayoutMsg({ ok: false, text: "Error de red." });
    } finally { setPayoutLoading(false); }
  };

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCard(cardId); setCardMsg(null);
    try {
      const r = await fetch(`/api/dashboard/payouts/debit-card/${cardId}`, { method: "DELETE" });
      const d = await r.json();
      setCardMsg({ ok: r.ok, text: r.ok ? "Tarjeta eliminada correctamente." : (d.error ?? "Error al eliminar.") });
      if (r.ok) load();
    } catch {
      setCardMsg({ ok: false, text: "Error de red." });
    } finally { setDeletingCard(null); }
  };

  const available   = data?.available   ?? 0;
  const pending     = data?.pending     ?? 0;
  const thisMonth   = data?.thisMonth   ?? 0;
  const grossVolume = data?.grossVolume ?? 0;
  const netVolume   = data?.netVolume   ?? 0;
  const totalFees   = data?.totalFees   ?? 0;
  const currency    = data?.currency    ?? "eur";
  const transfers   = data?.transfers   ?? [];

  const feeRate           = grossVolume > 0 ? ((totalFees / grossVolume) * 100).toFixed(1) : "0.0";
  const instantAvailable  = payoutInfo?.instantAvailable ?? false;
  const payoutFeeCents    = payoutInfo?.feeCents ?? 0;
  const payoutNetCents    = payoutInfo?.netCents ?? available;

  const hasCards     = (instantStatus?.cards.length ?? 0) > 0;
  const firstCard    = instantStatus?.cards[0];

  return (
    <Elements stripe={stripePromise}>
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
          {payoutMsg.ok && payoutMsg.method === "instant" && <Zap className="h-4 w-4 shrink-0" />}
          {payoutMsg.ok && payoutMsg.method !== "instant" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {!payoutMsg.ok && <XCircle className="h-4 w-4 shrink-0" />}
          {payoutMsg.text}
        </div>
      )}

      {/* ── Saldo disponible + Payout ──────────────────────────────────────── */}
      <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 mb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-2">
              SALDO DISPONIBLE
            </p>
            {loading
              ? <Sk h="h-10" w="w-40" />
              : <p className="text-[40px] font-semibold tracking-[-1.5px] text-[#0A0A0A] leading-none tabular-nums">
                  {fmt(available, currency)}
                </p>}
            <p className="text-[12px] text-[#9CA3AF] mt-2">Listo para retirar ahora</p>

            {/* Indicador de disponibilidad instant */}
            {!loading && (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] ${
                instantAvailable
                  ? "bg-[#DCFCE7] text-[#15803D]"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              }`}>
                {instantAvailable ? (
                  <>
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span>Payout instantáneo disponible · <strong>+1,5% de comisión</strong> ({fmt(payoutFeeCents, currency)})</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Solo transferencia estándar disponible · 2–3 días · <strong>sin comisión</strong></span>
                  </>
                )}
              </div>
            )}
            {!loading && !instantAvailable && (
              <p className="mt-2 text-[11px] text-[#9CA3AF]">
                Para activar payouts instantáneos añade una tarjeta de débito en tu configuración de cuenta Stripe.
              </p>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <button
              onClick={handleInstantPayout}
              disabled={payoutLoading || available === 0}
              className="flex items-center gap-2 rounded-[10px] bg-[#0A0A0A] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {payoutLoading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Zap className="h-4 w-4" />}
              {payoutLoading
                ? "Procesando…"
                : instantAvailable
                  ? `Instant Payout · ${fmt(payoutNetCents, currency)}`
                  : `Retirar · ${fmt(available, currency)}`}
            </button>
            {!loading && available === 0 && (
              <p className="text-[11px] text-[#9CA3AF]">Sin saldo disponible</p>
            )}
          </div>
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

      {/* ── Payouts instantáneos ──────────────────────────────────────────── */}
      <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-[#0A0A0A]" />
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Payouts instantáneos</h2>
        </div>

        {/* Feedback tarjeta */}
        {cardMsg && (
          <div className={`mb-4 flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-[12px] font-medium ${
            cardMsg.ok ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]" : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          }`}>
            {cardMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {cardMsg.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3">
            <Sk h="h-5" w="w-5" />
            <Sk h="h-4" w="w-48" />
          </div>
        ) : hasCards && firstCard ? (
          /* ── Tiene tarjeta de débito ── */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#15803D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] inline-block" />
                Activo
              </span>
              <span className="text-[12px] text-[#6B7280]">Instant payouts habilitados</span>
            </div>

            <div className="flex items-center justify-between rounded-[8px] border border-[#E5E7EB] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-14 items-center justify-center rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB]">
                  <CreditCard className="h-5 w-5 text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#0A0A0A]">
                    {firstCard.brand} débito ···· {firstCard.last4}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Vence {String(firstCard.expMonth).padStart(2, "0")}/{String(firstCard.expYear).slice(-2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCardMsg(null); setShowCardModal(true); }}
                  className="rounded-[7px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] text-[#6B7280] hover:bg-[#F9FAFB] transition"
                >
                  Cambiar
                </button>
                <button
                  onClick={() => handleDeleteCard(firstCard.id)}
                  disabled={deletingCard === firstCard.id}
                  className="rounded-[7px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[12px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-40 transition"
                >
                  {deletingCard === firstCard.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Sin tarjeta de débito ── */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF] inline-block" />
                No disponible
              </span>
            </div>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              Para activar los payouts instantáneos añade una tarjeta de débito como destino de pago.
              Solo las tarjetas de débito son válidas; las de crédito no están permitidas.
            </p>
            <button
              onClick={() => { setCardMsg(null); setShowCardModal(true); }}
              className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#F9FAFB] transition"
            >
              <CreditCard className="h-4 w-4" />
              + Añadir tarjeta de débito
            </button>
          </div>
        )}
      </div>

      {/* Modal añadir tarjeta */}
      {showCardModal && (
        <AddDebitCardModal
          onClose={() => setShowCardModal(false)}
          onSuccess={() => {
            setShowCardModal(false);
            setCardMsg({ ok: true, text: "Tarjeta vinculada correctamente. Instant payouts activados." });
            load();
          }}
        />
      )}

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
    </Elements>
  );
}
