"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Download, Plus, AlertTriangle, Clock,
  CheckCircle2, XCircle, Database, ArrowUpRight, RefreshCw,
  TrendingUp, Smartphone, Link2, MessageCircle,
  RotateCcw, Copy, X, Loader2, ExternalLink,
} from "lucide-react";
import { Button }            from "@/components/ui/button";
import { BalanceCard }       from "@/components/dashboard/BalanceCard";
import { MetricCard }        from "@/components/dashboard/MetricCard";
import { ConnectStatusCard } from "@/components/dashboard/ConnectStatusCard";
import { ActivityChart, type ChartPoint } from "@/components/dashboard/ActivityChart";
import { SectionHeader }     from "@/components/dashboard/SectionHeader";
import { EmptyState }        from "@/components/dashboard/EmptyState";
import { MobileHeader }      from "@/components/mobile/MobileHeader";
import { MobileCard, MetricRow } from "@/components/mobile/MobileCard";
import { PaymentItem }       from "@/components/mobile/PaymentItem";
import { WhatsAppPay }       from "@/components/mobile/WhatsAppPay";
import { EmbeddedNotificationBanner } from "@/components/connect/EmbeddedNotificationBanner";
import { OnboardingModal }   from "@/components/onboarding/OnboardingModal";
import type { ConnectAccount } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// Fallback cuando aún no hay datos de cuenta conectada
const EMPTY_CONNECT: ConnectAccount = {
  id:               "",
  stripeAccountId:  "—",
  businessName:     "Sin cuenta conectada",
  email:            "",
  country:          "ES",
  currency:         "eur",
  status:           "not_connected",
  chargesEnabled:   false,
  payoutsEnabled:   false,
  detailsSubmitted: false,
  createdAt:        "2000-01-01T00:00:00.000Z",
};

const POLL_MS = 5_000;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OverviewData {
  month: string; totalVolume: number; txCount: number; totalFees: number;
  availableBalance: number; pendingBalance: number; estimatedBalance: number;
  chartSeries: ChartPoint[];
  comparison: { volumeChange: number | null; txChange: number | null; feesChange: number | null };
}
interface DbPayment {
  id: string; stripePaymentIntentId: string; amount: number; currency: string;
  status: string; applicationFeeAmount: number; refundedAmount: number;
  description: string | null; failureCode: string | null; failureMessage: string | null;
  stripeCreatedAt: string | null; createdAt: string; capturedAt: string | null;
  connectedAccount: { stripeAccountId: string; businessName: string } | null;
}
interface PaymentsResponse {
  data: DbPayment[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
}
interface DashboardConnect {
  stripeAccountId: string; businessName: string; email: string; country: string;
  defaultCurrency: string; chargesEnabled: boolean; payoutsEnabled: boolean;
  detailsSubmitted: boolean; status: string;
}
interface DashboardData {
  balance: { available: { amount: number; currency: string }; pending: { amount: number; currency: string } };
  payouts:  { id: string; amount: number; currency: string; status: string; method: string; arrivalDate: string; description: string; createdAt: string }[];
  disputes: { id: string; amount: number; currency: string; status: string; reason: string; customerName?: string; evidenceDueBy?: string | null; createdAt: string }[];
  connect:  DashboardConnect | null;
}

// ─── Retry modal types ────────────────────────────────────────────────────────
interface RetryResult {
  url:        string;
  token:      string;
  qrDataUrl:  string;
  testMode:   boolean;
}

// ─── Status configs ───────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  SUCCEEDED:               { label: "Completado", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  FAILED:                  { label: "Fallido",    dot: "bg-red-400",     badge: "bg-red-50 text-red-600 ring-red-200"             },
  CANCELED:                { label: "Cancelado",  dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 ring-slate-200"       },
  PROCESSING:              { label: "Procesando", dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-600 ring-blue-200"          },
  REQUIRES_PAYMENT_METHOD: { label: "Pendiente",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-amber-200"       },
  REQUIRES_ACTION:         { label: "Acción req.",dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-amber-200"       },
};
const PAYOUT_STATUS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  paid:       { label: "Pagado",      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, cls: "text-emerald-700" },
  pending:    { label: "Pendiente",   icon: <Clock        className="h-3.5 w-3.5 text-amber-400"   />, cls: "text-amber-700"   },
  in_transit: { label: "En tránsito", icon: <Clock        className="h-3.5 w-3.5 text-blue-400"    />, cls: "text-blue-600"    },
  failed:     { label: "Fallido",     icon: <XCircle      className="h-3.5 w-3.5 text-red-400"     />, cls: "text-red-600"     },
  canceled:   { label: "Cancelado",   icon: <XCircle      className="h-3.5 w-3.5 text-slate-300"   />, cls: "text-slate-500"   },
};
const DISPUTE_STATUS: Record<string, { label: string; cls: string }> = {
  needs_response:         { label: "Responder",   cls: "bg-red-50 text-red-700 border-red-200"             },
  warning_needs_response: { label: "Responder",   cls: "bg-red-50 text-red-700 border-red-200"             },
  under_review:           { label: "En revisión", cls: "bg-amber-50 text-amber-700 border-amber-200"       },
  won:                    { label: "Ganada",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost:                   { label: "Perdida",      cls: "bg-slate-100 text-slate-500 border-slate-200"     },
  charge_refunded:        { label: "Reembolsada",  cls: "bg-slate-100 text-slate-500 border-slate-200"     },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100", className)} />;
}
function MetricSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <Skeleton className="h-3 w-24 mb-3" /><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-3 w-16" />
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? { label: status, dot: "bg-slate-300", badge: "bg-slate-50 text-slate-500 ring-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", cfg.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />{cfg.label}
    </span>
  );
}

// ─── Empty chart series (7 días a 0) — solo para cliente ─────────────────────
// No llamar en el render inicial (hydration mismatch con Date)
function emptyChartSeries(): ChartPoint[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), total: 0 };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter();

  const [overview,    setOverview]    = useState<OverviewData | null>(null);
  const [paymentsRes, setPaymentsRes] = useState<PaymentsResponse | null>(null);
  const [dashData,    setDashData]    = useState<DashboardData | null>(null);
  // Inicializar con array vacío para evitar hydration mismatch (new Date() difiere servidor/cliente)
  const [chartSeries, setChartSeries] = useState<ChartPoint[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Filtro de fecha ───────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<"Todo"|"12 meses"|"3 meses"|"30 días"|"Hoy">("30 días");
  const dateRangeLabel = (() => {
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day:"numeric", month:"short", year:"numeric" });
    if (dateRange === "Hoy") return `Hoy · ${fmt(now)}`;
    if (dateRange === "30 días") { const s = new Date(now); s.setDate(s.getDate()-30); return `${fmt(s)} – ${fmt(now)}`; }
    if (dateRange === "3 meses") { const s = new Date(now); s.setMonth(s.getMonth()-3); return `${fmt(s)} – ${fmt(now)}`; }
    if (dateRange === "12 meses") { const s = new Date(now); s.setFullYear(s.getFullYear()-1); return `${fmt(s)} – ${fmt(now)}`; }
    return `Todo el tiempo – ${fmt(now)}`;
  })();

  // ── Retry modal ───────────────────────────────────────────────────────────
  const [retryLoading,  setRetryLoading]  = useState<string | null>(null); // paymentId
  const [retryResult,   setRetryResult]   = useState<RetryResult | null>(null);
  const [retryCopied,   setRetryCopied]   = useState(false);

  async function handleRetry(paymentId: string) {
    setRetryLoading(paymentId);
    try {
      const res  = await fetch(`/api/payments/${paymentId}/retry`, { method: "POST" });
      const data = await res.json() as RetryResult & { error?: string };
      if (!res.ok) {
        alert(data.error ?? "Error al reintentar el cobro");
        return;
      }
      setRetryResult(data);
    } catch {
      alert("Error de conexión al reintentar el cobro");
    } finally {
      setRetryLoading(null);
    }
  }

  function copyRetryUrl() {
    if (!retryResult) return;
    navigator.clipboard.writeText(retryResult.url).then(() => {
      setRetryCopied(true);
      setTimeout(() => setRetryCopied(false), 2000);
    });
  }

  // ── Onboarding modal ──────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.needsOnboarding) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);

  function handleOnboardingComplete(mode: "test" | "live") {
    setShowOnboarding(false);
    if (mode === "live") {
      router.push("/app/connect/onboarding");
    }
  }

  // ── Fetch overview + payments (se refresca cada 5s) ──────────────────────
  const fetchOverviewAndPayments = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [ov, pm] = await Promise.all([
        fetch("/api/dashboard/overview").then(r => r.ok ? r.json() as Promise<OverviewData> : null).catch(() => null),
        fetch("/api/payments?limit=20").then(r => r.ok ? r.json() as Promise<PaymentsResponse> : null).catch(() => null),
      ]);
      if (ov) {
        setOverview(ov);
        setChartSeries(ov.chartSeries?.length ? ov.chartSeries : emptyChartSeries());
      }
      if (pm) setPaymentsRes(pm);
      setLastUpdate(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  // ── Fetch dashboard (payouts, disputas, connect) — solo al montar ────────
  const fetchDashboard = useCallback(async () => {
    const dd = await fetch("/api/dashboard").then(r => r.ok ? r.json() as Promise<DashboardData> : null).catch(() => null);
    if (dd) setDashData(dd);
  }, []);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchOverviewAndPayments(true), fetchDashboard()])
      .finally(() => setLoading(false));
  }, [fetchOverviewAndPayments, fetchDashboard]);

  // ── Polling cada 5s — se pausa cuando la pestaña está en background ─────
  useEffect(() => {
    const start = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => fetchOverviewAndPayments(true), POLL_MS);
    };
    const stop = () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
    const onVisibility = () => document.hidden ? stop() : start();

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchOverviewAndPayments]);

  const dbPayments   = paymentsRes?.data  ?? [];
  const payouts      = dashData?.payouts  ?? [];
  const disputes     = dashData?.disputes ?? [];
  const total        = paymentsRes?.meta.total ?? 0;
  const openDisputes = disputes.filter(d => d.status === "needs_response" || d.status === "warning_needs_response");
  const hasDbData    = (overview?.txCount ?? 0) > 0 || dbPayments.length > 0;

  const connectAccount: ConnectAccount = dashData?.connect
    ? {
        ...EMPTY_CONNECT,
        stripeAccountId:  dashData.connect.stripeAccountId,
        businessName:     dashData.connect.businessName,
        email:            dashData.connect.email,
        country:          dashData.connect.country,
        currency:         dashData.connect.defaultCurrency,
        chargesEnabled:   dashData.connect.chargesEnabled,
        payoutsEnabled:   dashData.connect.payoutsEnabled,
        detailsSubmitted: dashData.connect.detailsSubmitted,
        status:           dashData.connect.status.toLowerCase() as ConnectAccount["status"],
      }
    : EMPTY_CONNECT;

  // ─── VISTA MOBILE ────────────────────────────────────────────────────────────
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const MobileView = () => (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 md:hidden">
      <MobileHeader title="Inicio" />
      {showWhatsApp && <WhatsAppPay onClose={() => setShowWhatsApp(false)} />}

      <div className="w-full space-y-2.5 px-4 pb-4 pt-3">

        {/* Banner de verificación en móvil */}
        {needsVerification && (
          <Link
            href="/app/connect/onboarding"
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3.5",
              accountStatus === "NOT_CONNECTED"
                ? "border-blue-200 bg-blue-50"
                : "border-amber-200 bg-amber-50",
            )}
          >
            <AlertTriangle className={cn(
              "h-5 w-5 shrink-0",
              accountStatus === "NOT_CONNECTED" ? "text-blue-500" : "text-amber-500",
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[13px] font-semibold",
                accountStatus === "NOT_CONNECTED" ? "text-blue-900" : "text-amber-900",
              )}>
                {accountStatus === "NOT_CONNECTED"
                  ? "Activa cobros →"
                  : "Completa verificación →"}
              </p>
              <p className={cn(
                "text-[11px]",
                accountStatus === "NOT_CONNECTED" ? "text-blue-700" : "text-amber-700",
              )}>
                {accountStatus === "NOT_CONNECTED"
                  ? "Configura tu cuenta para cobrar"
                  : "Información adicional necesaria"}
              </p>
            </div>
          </Link>
        )}

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/app/payment-methods/qr"
            className="flex flex-col items-start gap-3 rounded-2xl bg-slate-900 px-4 py-4 active:scale-[0.97] transition-transform"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Smartphone className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">Cobro rápido</p>
              <p className="text-[11px] text-white/50 mt-0.5">QR · Link de pago</p>
            </div>
          </Link>
          <button
            onClick={() => setShowWhatsApp(true)}
            className="flex flex-col items-start gap-3 rounded-2xl bg-[#25D366] px-4 py-4 active:scale-[0.97] transition-transform"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <MessageCircle className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">Cobrar por</p>
              <p className="text-[11px] text-white/70 mt-0.5">WhatsApp</p>
            </div>
          </button>
        </div>
        <Link
          href="/app/payment-links?new=1"
          className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3.5 active:scale-[0.97] transition-transform"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shrink-0">
            <Link2 className="h-5 w-5 text-slate-700" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-900 leading-tight">Crear enlace de pago</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Comparte el link para cobrar online</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 ml-auto shrink-0" />
        </Link>

        {/* Resumen del día */}
        <MobileCard className="overflow-hidden p-0">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">Hoy</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label: "Volumen bruto", value: overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €" },
              { label: "Pagos",         value: String(overview?.txCount ?? 0) },
              { label: "Clientes",      value: "0" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center px-2 py-4">
                <p className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 leading-none">
                  {item.label}
                </p>
                <p className="mt-2 text-[22px] font-bold tabular-nums text-slate-900 leading-none">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Selector de período */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5" style={{ scrollbarWidth: "none" }}>
          {[
            { label: "1 S", active: true  },
            { label: "4 S", active: false },
            { label: "1 A", active: false },
            { label: "Mes", active: false },
            { label: "Trim.", active: false },
          ].map((p) => (
            <button
              key={p.label}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                p.active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-500"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Volumen bruto + mini gráfico */}
        <MobileCard>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] text-slate-500">Volumen bruto</p>
              <p className="mt-0.5 text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums">
                {overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €"}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">
                {overview?.txCount ?? 0} transacciones este mes
              </p>
            </div>
            {overview?.comparison.volumeChange != null && (
              <span className={cn(
                "mt-1 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                (overview.comparison.volumeChange ?? 0) >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              )}>
                {(overview.comparison.volumeChange ?? 0) >= 0 ? "+" : ""}
                {(overview.comparison.volumeChange ?? 0).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Gráfico de línea */}
          <div className="mt-4 w-full" style={{ height: 72 }}>
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
            ) : (() => {
              const pts   = chartSeries.length ? chartSeries : Array(7).fill({ total: 0, date: "" });
              const maxV  = Math.max(...pts.map((p: ChartPoint) => p.total), 1);
              const W2 = 320; const H2 = 62;
              const pL2 = 4; const pR2 = 4; const pT2 = 6; const pB2 = 14;
              const cW2 = W2 - pL2 - pR2; const cH2 = H2 - pT2 - pB2;
              const n2  = pts.length;
              const xs2 = pts.map((_: ChartPoint, i: number) => pL2 + (i / (n2 - 1)) * cW2);
              const ys2 = pts.map((p: ChartPoint) => pT2 + cH2 - (p.total / maxV) * cH2);
              const DAY2: Record<number,string> = {0:"Dom",1:"Lun",2:"Mar",3:"Mié",4:"Jue",5:"Vie",6:"Sáb"};
              const lbl2 = (d: string) => { if (!d) return ""; const dt = new Date(d+"T12:00:00"); return DAY2[dt.getDay()] ?? d.slice(5); };
              const crv2 = xs2.map((x: number, i: number) => {
                if (i === 0) return `M ${x} ${ys2[i]}`;
                const dx = (xs2[i] - xs2[i-1]) * 0.45;
                return `C ${xs2[i-1]+dx} ${ys2[i-1]}, ${x-dx} ${ys2[i]}, ${x} ${ys2[i]}`;
              }).join(" ");
              const ar2 = crv2 + ` L ${xs2[n2-1]} ${pT2+cH2} L ${xs2[0]} ${pT2+cH2} Z`;
              return (
                <svg width="100%" viewBox={`0 0 ${W2} ${H2}`} style={{ display:"block", overflow:"visible" }}>
                  <defs>
                    <linearGradient id="mb-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0f172a"/><stop offset="100%" stopColor="#334155"/>
                    </linearGradient>
                    <linearGradient id="mb-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.10"/><stop offset="100%" stopColor="#0f172a" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={ar2} fill="url(#mb-area)" />
                  <path d={crv2} fill="none" stroke="url(#mb-line)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx={xs2[n2-1]} cy={ys2[n2-1]} r="3.5" fill="#0f172a" stroke="white" strokeWidth="1.5" />
                  {pts.map((p: ChartPoint, i: number) => (
                    <text key={i} x={xs2[i]} y={H2-1} textAnchor="middle" fontSize="7.5" fontFamily="system-ui"
                      fill={i === n2-1 ? "#0f172a" : "#94a3b8"} fontWeight={i === n2-1 ? "700" : "400"}>
                      {lbl2(p.date)}
                    </text>
                  ))}
                </svg>
              );
            })()}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">hace 7 días</span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <TrendingUp className="h-3 w-3" />
              en tiempo real
            </span>
          </div>
        </MobileCard>

        {/* Grid 2 cols: Pagos + Comisión */}
        <div className="grid grid-cols-2 gap-2.5">
          <MobileCard>
            <p className="text-[12px] text-slate-500">Pagos</p>
            <p className="mt-0.5 text-[24px] font-bold text-slate-900 leading-none tabular-nums">
              {overview?.txCount ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">este mes</p>
          </MobileCard>
          <MobileCard>
            <p className="text-[12px] text-slate-500">Comisión</p>
            <p className="mt-0.5 text-[20px] font-bold text-slate-900 leading-none tabular-nums">
              {overview ? formatCurrency(overview.totalFees / 100) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">4% + 0,40 €</p>
          </MobileCard>
        </div>

        {/* Sección pagos recientes */}
        <MobileCard padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <p className="text-[14px] font-semibold text-slate-900">Pagos recientes</p>
            <Link href="/app/payouts" className="text-[12px] font-semibold text-slate-900 underline underline-offset-2">
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : dbPayments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <p className="text-[13px] text-slate-400">Sin pagos todavía</p>
              <Link href="/app/payment-links" className="text-[13px] font-semibold text-slate-900 underline underline-offset-2">
                Crear enlace de pago →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dbPayments.slice(0, 6).map((p) => (
                <PaymentItem
                  key={p.id}
                  amount={p.amount}
                  currency={p.currency}
                  status={p.status}
                  name={p.connectedAccount?.businessName ?? null}
                  date={p.stripeCreatedAt ?? p.createdAt}
                  description={p.description}
                />
              ))}
            </div>
          )}
        </MobileCard>

        {/* Alerta disputas */}
        {openDisputes.length > 0 && (
          <MobileCard className="border-red-100 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-red-800 leading-tight">
                  {openDisputes.length} disputa{openDisputes.length > 1 ? "s" : ""} pendiente{openDisputes.length > 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-[12px] text-red-600">
                  Responde antes de que venza el plazo
                </p>
              </div>
            </div>
          </MobileCard>
        )}
      </div>
    </div>
  );

  // Banner de verificación pendiente
  const needsVerification =
    dashData !== null &&
    (!dashData.connect?.chargesEnabled || dashData.connect?.status === "NOT_CONNECTED");
  const accountStatus = dashData?.connect?.status ?? "NOT_CONNECTED";

  const verificationBanner = needsVerification ? (
    <div className={cn(
      "flex items-start gap-3 rounded-2xl border px-5 py-4",
      accountStatus === "NOT_CONNECTED"
        ? "border-blue-200 bg-blue-50"
        : "border-amber-200 bg-amber-50",
    )}>
      <AlertTriangle className={cn(
        "mt-0.5 h-5 w-5 shrink-0",
        accountStatus === "NOT_CONNECTED" ? "text-blue-500" : "text-amber-500",
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[14px] font-semibold leading-tight",
          accountStatus === "NOT_CONNECTED" ? "text-blue-900" : "text-amber-900",
        )}>
          {accountStatus === "NOT_CONNECTED"
            ? "Activa cobros para empezar a recibir pagos"
            : "Completa tu verificación para empezar a cobrar"}
        </p>
        <p className={cn(
          "mt-0.5 text-[13px]",
          accountStatus === "NOT_CONNECTED" ? "text-blue-700" : "text-amber-700",
        )}>
          {accountStatus === "NOT_CONNECTED"
            ? "Tu cuenta de cobros aún no está configurada. Solo tardarás unos minutos."
            : "Tu cuenta necesita información adicional para activar los cobros."}
        </p>
      </div>
      <Link
        href="/app/connect/onboarding"
        className={cn(
          "shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold whitespace-nowrap",
          accountStatus === "NOT_CONNECTED"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-amber-600 text-white hover:bg-amber-700",
        )}
      >
        {accountStatus === "NOT_CONNECTED" ? "Activar cobros" : "Completar verificación"}
      </Link>
    </div>
  ) : null;

  // ─── VISTA DESKTOP ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal de onboarding inicial — se muestra si accountStatus === ONBOARDING_PENDING */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* ── Modal de reintento ──────────────────────────────────────────────── */}
      {retryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[16px] font-bold text-slate-900">Nuevo enlace de cobro</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {retryResult.testMode ? "Modo prueba · " : ""}Comparte este enlace con tu cliente
                </p>
              </div>
              <button
                onClick={() => { setRetryResult(null); setRetryCopied(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* QR */}
              <div className="flex justify-center">
                <div className="rounded-2xl border-4 border-slate-100 p-2 shadow-sm">
                  <Image
                    src={retryResult.qrDataUrl}
                    alt="QR del cobro"
                    width={200}
                    height={200}
                    unoptimized
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* URL */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="flex-1 truncate text-[12px] font-mono text-slate-600">
                  {retryResult.url}
                </span>
                <button
                  onClick={copyRetryUrl}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0"
                >
                  {retryCopied
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Copiado</>
                    : <><Copy className="h-3.5 w-3.5" /> Copiar</>
                  }
                </button>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Aquí tienes tu enlace de pago: ${retryResult.url}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-[13px] font-bold text-white hover:opacity-90 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
                <Link
                  href={retryResult.url}
                  target="_blank"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileView />
      <div className="hidden md:block min-h-full space-y-8 p-6 lg:p-8">

      {/* ── Banner verificación ─────────────────────────────────────────────── */}
      {verificationBanner}

      {/* ── Notification banner embebido (requisitos pendientes de Stripe) ─── */}
      {!needsVerification && connectAccount.stripeAccountId && connectAccount.stripeAccountId !== "—" && !connectAccount.stripeAccountId.startsWith("local_") && (
        <EmbeddedNotificationBanner accountId={connectAccount.stripeAccountId} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
            {loading ? <Skeleton className="h-3.5 w-40" /> : hasDbData ? (
              <><Database className="h-3.5 w-3.5 text-emerald-500" />Datos reales · <span className="capitalize">{overview?.month}</span></>
            ) : "Sin transacciones — procesa tu primer cobro"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de último refresco */}
          {lastUpdate && (
            <button
              onClick={() => fetchOverviewAndPayments()}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Refrescar ahora"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              {lastUpdate}
            </button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-slate-600">
            <Download className="h-3.5 w-3.5" />Exportar
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" asChild>
            <Link href="/app/payment-links"><Plus className="h-3.5 w-3.5" />Nuevo cobro</Link>
          </Button>
        </div>
      </div>

      {/* ── Filtros de fecha ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-slate-700">Descripción general</h2>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {(["Todo","12 meses","3 meses","30 días","Hoy"] as const).map(label => (
            <button
              key={label}
              onClick={() => setDateRange(label)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                dateRange === label
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards grandes con gráfico integrado (estilo polar.sh) ─────────── */}
      <section className="grid grid-cols-1 gap-0 lg:grid-cols-2 rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">

        {/* Card 1 — Volumen */}
        <div className="flex flex-col px-6 pt-6 pb-0 border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[13px] font-medium text-slate-500">Volumen</p>
            {overview?.comparison.volumeChange != null && (
              <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5",
                (overview.comparison.volumeChange ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                {(overview.comparison.volumeChange ?? 0) >= 0 ? "+" : ""}{(overview.comparison.volumeChange ?? 0).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[38px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none mt-1">
            {loading ? "—" : overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €"}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />{dateRangeLabel}
          </p>
          <div className="mt-8 -mx-6">
            {loading ? <Skeleton className="h-36 w-full" /> : <ActivityChart series={chartSeries} />}
          </div>
        </div>

        {/* Card 2 — MRR */}
        <div className="flex flex-col px-6 pt-6 pb-0">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[13px] font-medium text-slate-500">Ingresos mensuales recurrentes</p>
          </div>
          <p className="text-[38px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none mt-1">
            {loading ? "—" : overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €"}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />{dateRangeLabel}
          </p>
          <div className="mt-8 -mx-6">
            {loading ? <Skeleton className="h-36 w-full" /> : <ActivityChart series={chartSeries} />}
          </div>
        </div>
      </section>

      {/* ── Cards pequeñas + Connect ──────────────────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-5">

        {/* 3 cards pequeñas */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-0 rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {[
            {
              label: "Transacciones",
              value: loading ? "—" : String(overview?.txCount ?? 0),
              change: overview?.comparison.txChange,
            },
            {
              label: "Balance disponible",
              value: loading ? "—" : overview ? formatCurrency((overview.availableBalance ?? 0) / 100) : "0,00 €",
              change: null,
            },
            {
              label: "Tasa de conversión",
              value: loading ? "—" : overview && overview.txCount > 0
                ? `${((overview.txCount / Math.max(overview.txCount, 1)) * 100).toFixed(0)}%`
                : "0%",
              change: null,
            },
          ].map((card, i) => (
            <div key={card.label}
              className={cn("flex flex-col px-5 py-5", i < 2 && "border-r border-slate-100")}>
              <p className="text-[12px] font-medium text-slate-500">{card.label}</p>
              <p className="text-[28px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none mt-2">
                {card.value}
              </p>
              {card.change != null ? (
                <span className={cn("mt-2 text-[11px] font-semibold",
                  card.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}% vs ant.
                </span>
              ) : (
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />{dateRangeLabel}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Connect */}
        <div className="lg:col-span-2">
          <ConnectStatusCard account={connectAccount} />
        </div>
      </section>

      {/* ── Tabla de pagos ──────────────────────────────────────────────────── */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-800">Pagos recientes</h2>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                {total} resultado{total !== 1 ? "s" : ""} · refresco cada {POLL_MS / 1000}s
              </p>
            </div>
            {total > 20 && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-500" asChild>
                <Link href="/app/payments">Ver todos<ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : dbPayments.length === 0 ? (
            <EmptyState icon="↗" title="Sin pagos registrados" description="Los pagos aparecerán aquí cuando se reciba el webhook payment_intent.succeeded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      { label: "Estado",      align: "left"  },
                      { label: "ID",          align: "left"  },
                      { label: "Descripción", align: "left"  },
                      { label: "Importe",     align: "right" },
                      { label: "Fee",         align: "right" },
                      { label: "Fecha",       align: "right" },
                      { label: "Factura",     align: "right" },
                    ].map(({ label, align }) => (
                      <th key={label} className={cn("px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400", align === "right" ? "text-right" : "text-left")}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbPayments.map((p) => {
                    const isRefunded  = p.refundedAmount > 0;
                    const dateStr     = p.stripeCreatedAt ?? p.createdAt;
                    const isRetryable = p.status === "FAILED" || p.status === "CANCELED" || p.status === "REQUIRES_PAYMENT_METHOD";
                    const isRetrying  = retryLoading === p.id;
                    return (
                      <tr key={p.id} className="group transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={p.status} />
                            {isRefunded && <span className="text-[10px] text-slate-400">− {formatCurrency(p.refundedAmount / 100, p.currency)} reemb.</span>}
                            {isRetryable && (
                              <button
                                onClick={() => handleRetry(p.id)}
                                disabled={isRetrying}
                                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition w-fit"
                              >
                                {isRetrying
                                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Reintentando…</>
                                  : <><RotateCcw className="h-3 w-3" /> Reintentar →</>
                                }
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5"><span className="font-mono text-[11px] text-slate-400 group-hover:text-slate-600">{p.stripePaymentIntentId.slice(0, 18)}…</span></td>
                        <td className="px-6 py-3.5 max-w-[180px]"><span className="truncate block text-sm text-slate-600">{p.description ?? p.connectedAccount?.businessName ?? "—"}</span></td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={cn("text-sm font-semibold tabular-nums", p.status === "SUCCEEDED" ? "text-slate-900" : "text-slate-400 line-through")}>
                            {formatCurrency(p.amount / 100, p.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {p.applicationFeeAmount > 0
                            ? <span className="text-[12px] font-medium tabular-nums text-slate-500">{formatCurrency(p.applicationFeeAmount / 100, p.currency)}</span>
                            : <span className="text-[12px] text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right"><span className="text-xs tabular-nums text-slate-400">{formatDate(dateStr)}</span></td>
                        <td className="px-6 py-3.5 text-right">
                          {p.status === "SUCCEEDED" && (
                            <a
                              href={`/api/invoices/${p.id}`}
                              download
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                              title="Descargar factura PDF"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Payouts + Disputas ─────────────────────────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-[13px] font-semibold text-slate-800">Últimos payouts</h2>
          </div>
          {loading
            ? <div className="p-6 space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : payouts.length === 0
              ? <EmptyState icon="⬆" title="Sin payouts" description="Los payouts aparecerán cuando tu balance sea suficiente." compact />
              : <ul className="divide-y divide-slate-50">{payouts.map((p) => {
                  const ps = PAYOUT_STATUS[p.status] ?? { label: p.status, icon: null, cls: "text-slate-500" };
                  return (
                    <li key={p.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{ps.icon}</div>
                        <div><p className="text-sm font-medium text-slate-800">{p.description ?? "Payout"}</p><p className="text-xs text-slate-400">Llegada: {formatDate(p.arrivalDate)}</p></div>
                      </div>
                      <div className="text-right"><p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(p.amount / 100, p.currency)}</p><p className={cn("text-[11px] font-medium", ps.cls)}>{ps.label}</p></div>
                    </li>
                  );
                })}</ul>
          }
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 px-6 py-4 flex items-start justify-between">
            <h2 className="text-[13px] font-semibold text-slate-800">Disputas</h2>
            {openDisputes.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />{openDisputes.length} requieren respuesta
              </span>
            )}
          </div>
          {loading
            ? <div className="p-6 space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : disputes.length === 0
              ? <EmptyState icon="✓" title="Sin disputas" description="Cuando un cliente dispute un cobro, aparecerá aquí." compact />
              : <ul className="divide-y divide-slate-50">{disputes.slice(0, 4).map((d) => {
                  const ds     = DISPUTE_STATUS[d.status] ?? { label: d.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
                  const urgent = d.status === "needs_response" || d.status === "warning_needs_response";
                  return (
                    <li key={d.id} className={cn("flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50", urgent && "bg-red-50/50")}>
                      <div className="flex items-center gap-3">
                        {urgent ? <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" /> : <div className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-200" />}
                        <div>
                          <p className="text-sm font-medium text-slate-800">{d.customerName ?? "Cliente"}</p>
                          <p className="text-xs capitalize text-slate-400">{d.reason.replace(/_/g, " ")}{d.evidenceDueBy && <span className="ml-1.5 font-medium text-red-500">· Límite {formatDate(d.evidenceDueBy)}</span>}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(d.amount / 100, d.currency)}</p>
                        <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", ds.cls)}>{ds.label}</span>
                      </div>
                    </li>
                  );
                })}</ul>
          }
        </div>
      </section>
      </div>
    </>
  );
}
