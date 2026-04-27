"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, RotateCcw,
  CreditCard, User, Code2, AlertTriangle, RefreshCw,
  ExternalLink, ReceiptText,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ChargeDetail = {
  id:             string;
  amount:         number;
  amountCaptured: number;
  amountRefunded: number;
  currency:       string;
  status:         string;
  refunded:       boolean;
  description:    string | null;
  created:        number;
  fee:            number;
  net:            number;
  receiptUrl:     string | null;
  failureMessage: string | null;
  billingDetails: { name: string | null; email: string | null; address: Record<string, string> | null };
  card: {
    brand:    string;
    last4:    string;
    expMonth: number;
    expYear:  number;
    country:  string | null;
    funding:  string | null;
  } | null;
  customer:        { id: string | null; email: string | null };
  paymentIntentId: string | null;
  metadata:        Record<string, string>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2,
  });
}

function fmtDateTime(ts: number) {
  return new Date(ts * 1000).toLocaleString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  succeeded: { label: "Exitoso",      bg: "#EAF3DE", text: "#27500A", icon: <CheckCircle2 className="h-4 w-4" /> },
  pending:   { label: "Pendiente",    bg: "#FEF3C7", text: "#92400E", icon: <Clock        className="h-4 w-4" /> },
  failed:    { label: "Fallido",      bg: "#FEE2E2", text: "#991B1B", icon: <XCircle      className="h-4 w-4" /> },
  refunded:  { label: "Reembolsado",  bg: "#EFF6FF", text: "#1D4ED8", icon: <RotateCcw    className="h-4 w-4" /> },
};

const CARD_BRAND_COLORS: Record<string, string> = {
  visa:       "#1a1f71",
  mastercard: "#EB001B",
  amex:       "#2E77BC",
  discover:   "#FF6600",
};

function CardBrandBadge({ brand }: { brand: string }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ background: CARD_BRAND_COLORS[brand] ?? "#475569" }}
    >
      {brand}
    </span>
  );
}

function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "#E5E7EB" }}>
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#F1F5F9" }}>
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className={`text-[12px] font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ChargeDetailPage() {
  const { chargeId } = useParams<{ chargeId: string }>();
  const router       = useRouter();

  const [charge,        setCharge]        = useState<ChargeDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [refunding,     setRefunding]     = useState(false);
  const [refundMsg,     setRefundMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [refundConfirm, setRefundConfirm] = useState(false);

  useEffect(() => {
    if (!chargeId) return;
    setLoading(true);
    fetch(`/api/dashboard/payments/${chargeId}`)
      .then((r) => r.ok ? r.json() : r.json().then((e) => Promise.reject(e.error ?? "Error")))
      .then((d) => setCharge(d))
      .catch((e) => setError(typeof e === "string" ? e : "No se pudo cargar el pago"))
      .finally(() => setLoading(false));
  }, [chargeId]);

  const handleRefund = async () => {
    if (!charge) return;
    setRefunding(true);
    setRefundMsg(null);
    try {
      const r = await fetch(`/api/dashboard/payments/${chargeId}`, { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setRefundMsg({ ok: true, text: "Reembolso procesado correctamente." });
        setCharge((prev) => prev ? { ...prev, status: "refunded", refunded: true } : prev);
      } else {
        setRefundMsg({ ok: false, text: d.error ?? "Error al reembolsar" });
      }
    } catch {
      setRefundMsg({ ok: false, text: "Error de red" });
    } finally {
      setRefunding(false);
      setRefundConfirm(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
    </div>
  );

  if (error || !charge) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-slate-400">
      <AlertTriangle className="h-8 w-8" />
      <p className="text-[14px]">{error ?? "Pago no encontrado"}</p>
      <button onClick={() => router.back()} className="text-[13px] text-slate-500 underline">Volver</button>
    </div>
  );

  const cfg = STATUS_CONFIG[charge.status] ?? { label: charge.status, bg: "#F1F5F9", text: "#475569", icon: null };
  const availableDate = new Date((charge.created + 7 * 86400) * 1000).toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const metaEntries = Object.entries(charge.metadata ?? {});

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-8 py-3.5 border-b bg-white" style={{ borderColor: "#E5E7EB" }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Transacciones
        </button>
        <span className="text-slate-200">/</span>
        <span className="font-mono text-[12px] text-slate-500">{charge.id}</span>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-5">

        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-white p-6" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <p className="text-[40px] font-bold text-slate-900 tabular-nums leading-none">
                {fmt(charge.amount, charge.currency)}
              </p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{ backgroundColor: cfg.bg, color: cfg.text }}
              >
                {cfg.icon}{cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {charge.receiptUrl && (
                <a
                  href={charge.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition border rounded-lg px-3 py-1.5"
                  style={{ borderColor: "#E5E7EB" }}
                >
                  <ReceiptText className="h-3.5 w-3.5" /> Recibo
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {charge.status === "succeeded" && !charge.refunded && (
                refundConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-slate-500">¿Confirmar reembolso?</span>
                    <button
                      onClick={handleRefund}
                      disabled={refunding}
                      className="text-[12px] font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {refunding ? "Procesando…" : "Sí, reembolsar"}
                    </button>
                    <button
                      onClick={() => setRefundConfirm(false)}
                      className="text-[12px] text-slate-400 hover:text-slate-600 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRefundConfirm(true)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reembolsar
                  </button>
                )
              )}
            </div>
          </div>

          <p className="text-[13px] text-slate-400 mt-3">
            {fmtDateTime(charge.created)}
          </p>

          {refundMsg && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium"
              style={{
                background: refundMsg.ok ? "#F0FDF4" : "#FEF2F2",
                color:      refundMsg.ok ? "#166534" : "#991B1B",
                border:     `1px solid ${refundMsg.ok ? "#BBF7D0" : "#FECACA"}`,
              }}
            >
              {refundMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {refundMsg.text}
            </div>
          )}

          {charge.failureMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] text-red-700 border border-red-100">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {charge.failureMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Actividad ───────────────────────────────────────────────── */}
          <Section title="Actividad" icon={<Clock className="h-4 w-4" />}>
            <div className="space-y-3">
              {charge.refunded && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 shrink-0 ring-4 ring-blue-50" />
                  <div>
                    <p className="text-[12px] font-medium text-slate-700">Pago reembolsado</p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(charge.created)}</p>
                  </div>
                </div>
              )}
              {charge.status === "succeeded" && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0 ring-4 ring-emerald-50" />
                  <div>
                    <p className="text-[12px] font-medium text-slate-700">Pago autorizado ✓</p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(charge.created)}</p>
                  </div>
                </div>
              )}
              {charge.status === "failed" && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-red-400 shrink-0 ring-4 ring-red-50" />
                  <div>
                    <p className="text-[12px] font-medium text-red-700">Pago rechazado</p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(charge.created)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-300 shrink-0 ring-4 ring-slate-50" />
                <div>
                  <p className="text-[12px] font-medium text-slate-700">Pago iniciado</p>
                  <p className="text-[11px] text-slate-400">{fmtDateTime(charge.created)}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Desglose ─────────────────────────────────────────────────── */}
          <Section title="Desglose del pago" icon={<ReceiptText className="h-4 w-4" />}>
            <Row label="Importe del pago"  value={<span className="tabular-nums">{fmt(charge.amount, charge.currency)}</span>} />
            <Row label="Comisión PayForce"  value={<span className="tabular-nums text-red-500">−{fmt(charge.fee, charge.currency)}</span>} />
            <Row
              label="Importe neto"
              value={<span className="tabular-nums font-bold text-emerald-700">{fmt(charge.net, charge.currency)}</span>}
            />
            {charge.amountRefunded > 0 && (
              <Row
                label="Reembolsado"
                value={<span className="tabular-nums text-blue-600">−{fmt(charge.amountRefunded, charge.currency)}</span>}
              />
            )}
            <Row
              label="Fondos disponibles"
              value={<span className="text-slate-500">{charge.status === "succeeded" ? availableDate : "—"}</span>}
            />
          </Section>

          {/* ── Método de pago ──────────────────────────────────────────── */}
          <Section title="Método de pago" icon={<CreditCard className="h-4 w-4" />}>
            {charge.card ? (
              <>
                <Row label="Tipo"            value={<CardBrandBadge brand={charge.card.brand} />} />
                <Row label="Número"          value={`•••• •••• •••• ${charge.card.last4}`} mono />
                <Row label="Vencimiento"     value={`${String(charge.card.expMonth).padStart(2, "0")} / ${charge.card.expYear}`} />
                {charge.card.country  && <Row label="País emisor"  value={charge.card.country} />}
                {charge.card.funding  && <Row label="Tipo tarjeta" value={charge.card.funding === "credit" ? "Crédito" : charge.card.funding === "debit" ? "Débito" : charge.card.funding} />}
              </>
            ) : (
              <p className="text-[12px] text-slate-300 py-2">Sin información de tarjeta</p>
            )}
          </Section>

          {/* ── Cliente ─────────────────────────────────────────────────── */}
          <Section title="Cliente" icon={<User className="h-4 w-4" />}>
            {charge.billingDetails.name  && <Row label="Nombre" value={charge.billingDetails.name} />}
            {charge.billingDetails.email && <Row label="Email"  value={charge.billingDetails.email} />}
            {charge.customer.id && (
              <Row label="ID cliente Stripe" value={charge.customer.id} mono />
            )}
            {charge.paymentIntentId && (
              <Row label="Payment Intent" value={charge.paymentIntentId} mono />
            )}
            {!charge.billingDetails.name && !charge.billingDetails.email && !charge.customer.id && (
              <p className="text-[12px] text-slate-300 py-2">Sin datos de cliente</p>
            )}
          </Section>
        </div>

        {/* ── Metadatos ──────────────────────────────────────────────────── */}
        {metaEntries.length > 0 && (
          <Section title="Metadatos" icon={<Code2 className="h-4 w-4" />}>
            <div className="space-y-0">
              {metaEntries.map(([k, v]) => (
                <Row key={k} label={k} value={v} mono />
              ))}
            </div>
          </Section>
        )}

        {/* ID del cargo */}
        <p className="text-center text-[11px] text-slate-300 font-mono pb-4">
          Charge ID: {charge.id}
        </p>
      </div>
    </div>
  );
}
