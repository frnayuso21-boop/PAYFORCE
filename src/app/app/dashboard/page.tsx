"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, AlertTriangle, Clock,
  CheckCircle2, XCircle, ArrowUpRight, RefreshCw,
  Smartphone, Link2, MessageCircle,
  RotateCcw, Copy, X, Loader2, ExternalLink, Bell, BellOff, Download,
} from "lucide-react";
import { ActivityChart, type ChartPoint } from "@/components/dashboard/ActivityChart";
import { DateRangePicker, type DateRange } from "@/components/dashboard/DateRangePicker";
import { MobileHeader }      from "@/components/mobile/MobileHeader";
import { MobileCard }        from "@/components/mobile/MobileCard";
import { PaymentItem }       from "@/components/mobile/PaymentItem";
import { WhatsAppPay }       from "@/components/mobile/WhatsAppPay";
import { EmbeddedNotificationBanner } from "@/components/connect/EmbeddedNotificationBanner";
import { OnboardingModal }   from "@/components/onboarding/OnboardingModal";
import { ConnectStatusCard } from "@/components/dashboard/ConnectStatusCard";
import type { ConnectAccount } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────
const EMPTY_CONNECT: ConnectAccount = {
  id: "", stripeAccountId: "—", businessName: "Sin cuenta conectada",
  email: "", country: "ES", currency: "eur", status: "not_connected",
  chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false,
  createdAt: "2000-01-01T00:00:00.000Z",
};
const POLL_MS = 60_000;

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
interface RetryResult { url: string; token: string; qrDataUrl: string; testMode: boolean; }

// ─── Status badge (nuevo diseño premium) ─────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  SUCCEEDED:               { label: "Exitoso",    cls: "bg-[#DCFCE7] text-[#15803D]"  },
  FAILED:                  { label: "Fallido",    cls: "bg-[#FEE2E2] text-[#991B1B]"  },
  CANCELED:                { label: "Cancelado",  cls: "bg-[#F3F4F6] text-[#6B7280]"  },
  PROCESSING:              { label: "Procesando", cls: "bg-[#DBEAFE] text-[#1D4ED8]"  },
  REQUIRES_PAYMENT_METHOD: { label: "Pendiente",  cls: "bg-[#FEF9C3] text-[#A16207]"  },
  REQUIRES_ACTION:         { label: "Pendiente",  cls: "bg-[#FEF9C3] text-[#A16207]"  },
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

// ─── Micro-componentes ────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[6px] bg-[#F3F4F6]", className)} />;
}
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-[#F3F4F6] text-[#6B7280]" };
  return (
    <span className={cn("inline-flex items-center rounded-[980px] px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
function KpiCard({ label, value, sub, subPositive, loading: l }: {
  label: string; value: string; sub?: string; subPositive?: boolean; loading: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-2">{label}</p>
      {l
        ? <><Sk className="h-7 w-28 mb-1" /><Sk className="h-3 w-16 mt-1" /></>
        : <>
            <p className="text-[28px] font-semibold tracking-[-1px] text-[#0A0A0A] leading-none">{value}</p>
            {sub && (
              <p className={cn("text-[11px] mt-1", subPositive ? "text-[#22C55E]" : sub.startsWith("-") ? "text-[#EF4444]" : "text-[#9CA3AF]")}>
                {sub}
              </p>
            )}
          </>
      }
    </div>
  );
}

// ─── Empty chart series ───────────────────────────────────────────────────────
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
  const [chartSeries, setChartSeries] = useState<ChartPoint[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Filtro de fecha ───────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const to   = new Date();
    const from = new Date(to); from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });

  // ── Retry modal ───────────────────────────────────────────────────────────
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [retryResult,  setRetryResult]  = useState<RetryResult | null>(null);
  const [retryCopied,  setRetryCopied]  = useState(false);

  async function handleRetry(paymentId: string) {
    setRetryLoading(paymentId);
    try {
      const res  = await fetch(`/api/payments/${paymentId}/retry`, { method: "POST" });
      const data = await res.json() as RetryResult & { error?: string };
      if (!res.ok) { alert(data.error ?? "Error al reintentar el cobro"); return; }
      setRetryResult(data);
    } catch { alert("Error de conexión al reintentar el cobro"); }
    finally  { setRetryLoading(null); }
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
      .then((data) => { if (data?.needsOnboarding) setShowOnboarding(true); })
      .catch(() => {});
  }, []);
  function handleOnboardingComplete(mode: "test" | "live") {
    setShowOnboarding(false);
    if (mode === "live") router.push("/app/connect/onboarding");
  }

  // ── Fetch overview + payments ─────────────────────────────────────────────
  const fetchOverviewAndPayments = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const ovParams = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      const pmParams = new URLSearchParams({ limit: "20", from: dateRange.from, to: dateRange.to });
      const [ov, pm] = await Promise.all([
        fetch(`/api/dashboard/overview?${ovParams}`).then(r => r.ok ? r.json() as Promise<OverviewData> : null).catch(() => null),
        fetch(`/api/payments?${pmParams}`).then(r => r.ok ? r.json() as Promise<PaymentsResponse> : null).catch(() => null),
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
  }, [dateRange]);

  useEffect(() => { void fetchOverviewAndPayments(false); }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboard = useCallback(async () => {
    const dd = await fetch("/api/dashboard").then(r => r.ok ? r.json() as Promise<DashboardData> : null).catch(() => null);
    if (dd) setDashData(dd);
  }, []);

  useEffect(() => {
    Promise.all([fetchOverviewAndPayments(true), fetchDashboard()]).finally(() => setLoading(false));
  }, [fetchOverviewAndPayments, fetchDashboard]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const start = () => { if (!pollRef.current) pollRef.current = setInterval(() => fetchOverviewAndPayments(true), POLL_MS); };
    const stop  = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    const onVis = () => document.hidden ? stop() : start();
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchOverviewAndPayments]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const dbPayments   = paymentsRes?.data  ?? [];
  const payouts      = dashData?.payouts  ?? [];
  const disputes     = dashData?.disputes ?? [];
  const total        = paymentsRes?.meta.total ?? 0;
  const openDisputes = disputes.filter(d => d.status === "needs_response" || d.status === "warning_needs_response");

  // KPI: Cobrado hoy
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayPmts = dbPayments.filter(p => p.status === "SUCCEEDED" && (p.stripeCreatedAt ?? p.createdAt).slice(0, 10) === todayStr);
  const todayVol  = todayPmts.reduce((s, p) => s + p.amount, 0);
  // KPI: Devoluciones %
  const totalRefunded  = dbPayments.reduce((s, p) => s + (p.refundedAmount ?? 0), 0);
  const totalSucceeded = dbPayments.reduce((s, p) => p.status === "SUCCEEDED" ? s + p.amount : s, 0);
  const refundPct      = totalSucceeded > 0 ? (totalRefunded / totalSucceeded) * 100 : 0;

  const connectAccount: ConnectAccount = dashData?.connect
    ? { ...EMPTY_CONNECT, stripeAccountId: dashData.connect.stripeAccountId, businessName: dashData.connect.businessName,
        email: dashData.connect.email, country: dashData.connect.country, currency: dashData.connect.defaultCurrency,
        chargesEnabled: dashData.connect.chargesEnabled, payoutsEnabled: dashData.connect.payoutsEnabled,
        detailsSubmitted: dashData.connect.detailsSubmitted, status: dashData.connect.status.toLowerCase() as ConnectAccount["status"] }
    : EMPTY_CONNECT;

  const needsVerification = dashData !== null && (!dashData.connect?.chargesEnabled || dashData.connect?.status === "NOT_CONNECTED");
  const accountStatus     = dashData?.connect?.status ?? "NOT_CONNECTED";

  // ── Notificaciones push ───────────────────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "active" | "denied">("idle");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "denied") { setPushStatus("denied"); return; }
    navigator.serviceWorker?.getRegistration("/sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setPushStatus("active");
    }).catch(() => null);
  }, []);
  async function handleTogglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { alert("Tu navegador no soporta notificaciones push."); return; }
    if (pushStatus === "active") {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setPushStatus("idle"); return;
    }
    setPushStatus("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub  = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res  = await fetch("/api/notifications/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }) });
      setPushStatus(res.ok ? "active" : "idle");
    } catch (err) {
      setPushStatus((err as { name?: string })?.name === "NotAllowedError" ? "denied" : "idle");
    }
  }

  // ─── VISTA MOBILE ────────────────────────────────────────────────────────────
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const MobileView = () => (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 md:hidden">
      <MobileHeader title="Inicio" />
      {showWhatsApp && <WhatsAppPay onClose={() => setShowWhatsApp(false)} />}
      <div className="w-full space-y-2.5 px-4 pb-4 pt-3">
        {needsVerification && (
          <Link href="/app/connect/onboarding" className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3.5",
            accountStatus === "NOT_CONNECTED" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50")}>
            <AlertTriangle className={cn("h-5 w-5 shrink-0", accountStatus === "NOT_CONNECTED" ? "text-blue-500" : "text-amber-500")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-[13px] font-semibold", accountStatus === "NOT_CONNECTED" ? "text-blue-900" : "text-amber-900")}>
                {accountStatus === "NOT_CONNECTED" ? "Activa cobros →" : "Completa verificación →"}
              </p>
              <p className={cn("text-[11px]", accountStatus === "NOT_CONNECTED" ? "text-blue-700" : "text-amber-700")}>
                {accountStatus === "NOT_CONNECTED" ? "Configura tu cuenta para cobrar" : "Información adicional necesaria"}
              </p>
            </div>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/app/payment-methods/qr" className="flex flex-col items-start gap-3 rounded-2xl bg-slate-900 px-4 py-4 active:scale-[0.97] transition-transform">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Smartphone className="h-5 w-5 text-white" strokeWidth={1.8} /></div>
            <div><p className="text-[15px] font-bold text-white leading-tight">Cobro rápido</p><p className="text-[11px] text-white/50 mt-0.5">QR · Link de pago</p></div>
          </Link>
          <button onClick={() => setShowWhatsApp(true)} className="flex flex-col items-start gap-3 rounded-2xl bg-[#25D366] px-4 py-4 active:scale-[0.97] transition-transform">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><MessageCircle className="h-5 w-5 text-white" strokeWidth={1.8} /></div>
            <div><p className="text-[15px] font-bold text-white leading-tight">Cobrar por</p><p className="text-[11px] text-white/70 mt-0.5">WhatsApp</p></div>
          </button>
        </div>
        <Link href="/app/payment-links?new=1" className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3.5 active:scale-[0.97] transition-transform">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shrink-0"><Link2 className="h-5 w-5 text-slate-700" strokeWidth={1.8} /></div>
          <div><p className="text-[15px] font-bold text-slate-900 leading-tight">Crear enlace de pago</p><p className="text-[11px] text-slate-400 mt-0.5">Comparte el link para cobrar online</p></div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 ml-auto shrink-0" />
        </Link>
        <MobileCard className="overflow-hidden p-0">
          <div className="px-4 pt-4 pb-2"><p className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">Hoy</p></div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label: "Volumen bruto", value: overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €" },
              { label: "Pagos",         value: String(overview?.txCount ?? 0) },
              { label: "Clientes",      value: "0" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center px-2 py-4">
                <p className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 leading-none">{item.label}</p>
                <p className="mt-2 text-[22px] font-bold tabular-nums text-slate-900 leading-none">{item.value}</p>
              </div>
            ))}
          </div>
        </MobileCard>
        <MobileCard padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <p className="text-[14px] font-semibold text-slate-900">Pagos recientes</p>
            <Link href="/app/payments" className="text-[12px] font-semibold text-slate-900 underline underline-offset-2">Ver todos</Link>
          </div>
          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2"><div className="h-3 w-28 animate-pulse rounded bg-slate-100" /><div className="h-3 w-36 animate-pulse rounded bg-slate-100" /></div>
                </div>
              ))}
            </div>
          ) : dbPayments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <p className="text-[13px] text-slate-400">Sin pagos todavía</p>
              <Link href="/app/payment-links" className="text-[13px] font-semibold text-slate-900 underline underline-offset-2">Crear enlace de pago →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dbPayments.slice(0, 6).map((p) => (
                <PaymentItem key={p.id} amount={p.amount} currency={p.currency} status={p.status}
                  name={p.connectedAccount?.businessName ?? null} date={p.stripeCreatedAt ?? p.createdAt} description={p.description} />
              ))}
            </div>
          )}
        </MobileCard>
        {openDisputes.length > 0 && (
          <MobileCard className="border-red-100 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-red-800 leading-tight">{openDisputes.length} disputa{openDisputes.length > 1 ? "s" : ""} pendiente{openDisputes.length > 1 ? "s" : ""}</p>
                <p className="mt-0.5 text-[12px] text-red-600">Responde antes de que venza el plazo</p>
              </div>
            </div>
          </MobileCard>
        )}
      </div>
    </div>
  );

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* Modal de reintento */}
      {retryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[16px] font-bold text-slate-900">Nuevo enlace de cobro</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{retryResult.testMode ? "Modo prueba · " : ""}Comparte este enlace con tu cliente</p>
              </div>
              <button onClick={() => { setRetryResult(null); setRetryCopied(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-2xl border-4 border-slate-100 p-2 shadow-sm">
                  <Image src={retryResult.qrDataUrl} alt="QR del cobro" width={200} height={200} unoptimized className="rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="flex-1 truncate text-[12px] font-mono text-slate-600">{retryResult.url}</span>
                <button onClick={copyRetryUrl} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0">
                  {retryCopied ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(`Aquí tienes tu enlace de pago: ${retryResult.url}`)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-[13px] font-bold text-white hover:opacity-90 transition">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <Link href={retryResult.url} target="_blank" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition">
                  <ExternalLink className="h-4 w-4" /> Abrir
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista móvil */}
      <MobileView />

      {/* ─── VISTA DESKTOP ─────────────────────────────────────────────────────── */}
      <div className="hidden md:block min-h-full space-y-5 p-6 lg:p-8 bg-[#F9FAFB]">

        {/* Banner verificación */}
        {needsVerification && (
          <div className={cn("flex items-start gap-3 rounded-[10px] border px-5 py-4",
            accountStatus === "NOT_CONNECTED" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50")}>
            <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", accountStatus === "NOT_CONNECTED" ? "text-blue-500" : "text-amber-500")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-[14px] font-semibold leading-tight", accountStatus === "NOT_CONNECTED" ? "text-blue-900" : "text-amber-900")}>
                {accountStatus === "NOT_CONNECTED" ? "Activa cobros para empezar a recibir pagos" : "Completa tu verificación para empezar a cobrar"}
              </p>
              <p className={cn("mt-0.5 text-[13px]", accountStatus === "NOT_CONNECTED" ? "text-blue-700" : "text-amber-700")}>
                {accountStatus === "NOT_CONNECTED" ? "Tu cuenta de cobros aún no está configurada. Solo tardarás unos minutos." : "Tu cuenta necesita información adicional para activar los cobros."}
              </p>
            </div>
            <Link href="/app/connect/onboarding" className={cn("shrink-0 rounded-[8px] px-4 py-2 text-[13px] font-semibold whitespace-nowrap",
              accountStatus === "NOT_CONNECTED" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-amber-600 text-white hover:bg-amber-700")}>
              {accountStatus === "NOT_CONNECTED" ? "Activar cobros" : "Completar verificación"}
            </Link>
          </div>
        )}

        {/* Stripe notification banner */}
        {!needsVerification && connectAccount.stripeAccountId && connectAccount.stripeAccountId !== "—" && !connectAccount.stripeAccountId.startsWith("local_") && (
          <EmbeddedNotificationBanner accountId={connectAccount.stripeAccountId} />
        )}

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-[#0A0A0A]">Inicio</h1>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {loading ? "Cargando datos…" : `${total} transacción${total !== 1 ? "es" : ""} en el período seleccionado`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <button onClick={() => fetchOverviewAndPayments()} title="Refrescar"
                className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11px] text-[#9CA3AF] transition hover:bg-white hover:text-[#0A0A0A] border border-transparent hover:border-[#E5E7EB]">
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />{lastUpdate}
              </button>
            )}
            {pushStatus !== "denied" && (
              <button onClick={handleTogglePush} disabled={pushStatus === "loading"}
                title={pushStatus === "active" ? "Desactivar notificaciones" : "Activar notificaciones"}
                className={cn("flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium transition",
                  pushStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-slate-50",
                  pushStatus === "loading" && "opacity-60 cursor-not-allowed")}>
                {pushStatus === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : pushStatus === "active" ? <><Bell className="h-3.5 w-3.5" />Notificaciones activas</>
                  : <><BellOff className="h-3.5 w-3.5" />Activar notificaciones</>}
              </button>
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} align="right" />
            <Link href="/app/payment-links"
              className="flex items-center gap-1.5 rounded-[8px] bg-[#0A0A0A] px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#1a1a1a]">
              <Plus className="h-3.5 w-3.5" />Nuevo cobro
            </Link>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label="Cobrado hoy"
            value={formatCurrency(todayVol / 100)}
            sub={todayPmts.length > 0 ? `${todayPmts.length} pago${todayPmts.length > 1 ? "s" : ""} hoy` : "Sin pagos hoy"}
            loading={loading}
          />
          <KpiCard
            label="Este mes"
            value={overview ? formatCurrency(overview.totalVolume / 100) : "0,00 €"}
            sub={overview?.comparison.volumeChange != null
              ? `${overview.comparison.volumeChange >= 0 ? "+" : ""}${overview.comparison.volumeChange.toFixed(1)}% vs mes anterior`
              : undefined}
            subPositive={(overview?.comparison.volumeChange ?? 0) >= 0}
            loading={loading}
          />
          <KpiCard
            label="Devoluciones"
            value={`${refundPct.toFixed(1)}%`}
            sub={totalRefunded > 0 ? `${formatCurrency(totalRefunded / 100)} devueltos` : "Sin devoluciones"}
            subPositive={refundPct === 0}
            loading={loading}
          />
        </div>

        {/* ── Gráfico semanal + Connect ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">

          {/* Gráfico de barras semanal */}
          <div className="col-span-2 rounded-[10px] border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]">Volumen semanal</p>
              {overview?.comparison.volumeChange != null && (
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-[6px]",
                  (overview.comparison.volumeChange ?? 0) >= 0 ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#991B1B]")}>
                  {(overview.comparison.volumeChange ?? 0) >= 0 ? "+" : ""}{(overview.comparison.volumeChange ?? 0).toFixed(1)}%
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-end gap-[6px] h-[60px]">
                {Array.from({ length: 7 }).map((_, i) => <Sk key={i} className={cn("flex-1 rounded-t-[3px]", i < 3 ? "h-3/4" : i === 6 ? "h-full" : "h-1/2")} />)}
              </div>
            ) : (() => {
              const pts   = chartSeries.length ? chartSeries : emptyChartSeries();
              const maxV  = Math.max(...pts.map(p => p.total), 1);
              const today = new Date().toISOString().slice(0, 10);
              const DAY: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };
              return (
                <div>
                  <div className="flex items-end gap-[6px] h-[60px]">
                    {pts.map((p, i) => {
                      const h   = Math.max((p.total / maxV) * 100, p.total > 0 ? 8 : 4);
                      const isT = p.date === today;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            title={`${p.date}: ${formatCurrency(p.total / 100)}`}
                            style={{ height: `${h}%` }}
                            className={cn("w-full rounded-t-[3px] transition-all", isT ? "bg-[#0A0A0A]" : "bg-[#E5E7EB]")}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-[6px] mt-2">
                    {pts.map((p, i) => {
                      const dt  = p.date ? new Date(p.date + "T12:00:00") : null;
                      const lbl = dt ? (DAY[dt.getDay()] ?? "") : "";
                      const isT = p.date === today;
                      return (
                        <div key={i} className="flex-1 text-center">
                          <span className={cn("text-[10px]", isT ? "font-semibold text-[#0A0A0A]" : "text-[#9CA3AF]")}>{lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Mini activity chart debajo de las barras */}
            <div className="mt-4 -mx-5 border-t border-[#F3F4F6]">
              {loading
                ? <Sk className="h-16 w-full rounded-none" />
                : <ActivityChart series={chartSeries} />}
            </div>
          </div>

          {/* Connect status */}
          <div>
            <ConnectStatusCard account={connectAccount} />
          </div>
        </div>

        {/* ── Tabla de transacciones recientes ─────────────────────────────── */}
        <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">

          {/* Header tabla */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#0A0A0A]">Transacciones recientes</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9CA3AF]">{total} resultado{total !== 1 ? "s" : ""}</span>
              {total > 20 && (
                <Link href="/app/payments" className="flex items-center gap-1 text-[11px] font-medium text-[#0A0A0A] hover:underline">
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Cabecera columnas */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-0 border-b border-[#E5E7EB] px-4 py-2.5">
            {["CLIENTE / DESCRIPCIÓN", "ID", "IMPORTE", "ESTADO", "FECHA"].map((h, i) => (
              <p key={h} className={cn("text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]", i >= 2 && "text-right")}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-[#F3F4F6]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-0 px-4 py-3 items-center">
                  <Sk className="h-3.5 w-40" /><Sk className="h-3 w-28" /><Sk className="h-3 w-16 ml-auto" /><Sk className="h-5 w-14 ml-auto rounded-[980px]" /><Sk className="h-3 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : dbPayments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14">
              <p className="text-[13px] text-[#9CA3AF]">Sin transacciones en este período</p>
              <Link href="/app/payment-links" className="text-[13px] font-semibold text-[#0A0A0A] hover:underline">
                Crear enlace de pago →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {dbPayments.map((p, idx) => {
                const dateStr    = p.stripeCreatedAt ?? p.createdAt;
                const isRetryable = p.status === "FAILED" || p.status === "CANCELED" || p.status === "REQUIRES_PAYMENT_METHOD";
                const isRetrying  = retryLoading === p.id;
                const isLast      = idx === dbPayments.length - 1;
                return (
                  <div key={p.id}
                    className={cn("grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-0 px-4 py-3 items-center hover:bg-[#F9FAFB] transition-colors",
                      isLast && "border-b-0")}>

                    {/* Cliente / Descripción */}
                    <div className="min-w-0 pr-3">
                      <p className="text-[12px] font-medium text-[#0A0A0A] truncate">
                        {p.description ?? p.connectedAccount?.businessName ?? "—"}
                      </p>
                      {p.refundedAmount > 0 && (
                        <p className="text-[10px] text-[#9CA3AF]">− {formatCurrency(p.refundedAmount / 100, p.currency)} devuelto</p>
                      )}
                      {isRetryable && (
                        <button onClick={() => handleRetry(p.id)} disabled={isRetrying}
                          className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 mt-0.5 w-fit">
                          {isRetrying ? <><Loader2 className="h-3 w-3 animate-spin" /> Reintentando…</> : <><RotateCcw className="h-3 w-3" /> Reintentar</>}
                        </button>
                      )}
                    </div>

                    {/* ID */}
                    <p className="font-mono text-[10px] text-[#9CA3AF] truncate pr-3">{p.stripePaymentIntentId.slice(0, 20)}…</p>

                    {/* Importe */}
                    <div className="text-right pr-4">
                      <p className={cn("text-[12px] font-semibold tabular-nums", p.status === "SUCCEEDED" ? "text-[#0A0A0A]" : "text-[#9CA3AF] line-through")}>
                        {formatCurrency(p.amount / 100, p.currency)}
                      </p>
                      {p.applicationFeeAmount > 0 && (
                        <p className="text-[10px] text-[#9CA3AF]">{formatCurrency(p.applicationFeeAmount / 100, p.currency)} fee</p>
                      )}
                    </div>

                    {/* Estado */}
                    <div className="flex justify-end pr-4">
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Fecha + PDF */}
                    <div className="text-right">
                      <p className="text-[11px] tabular-nums text-[#9CA3AF]">{formatDate(dateStr)}</p>
                      {p.status === "SUCCEEDED" && (
                        <a href={`/api/invoices/${p.id}`} download title="Descargar factura PDF"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition mt-0.5">
                          <Download className="h-2.5 w-2.5" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Payouts + Disputas ───────────────────────────────────────────── */}
        <div className="grid gap-3 lg:grid-cols-2">

          {/* Payouts */}
          <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">
            <div className="border-b border-[#E5E7EB] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#0A0A0A]">Últimos payouts</p>
            </div>
            {loading ? (
              <div className="divide-y divide-[#F3F4F6]">{[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5"><Sk className="h-4 w-4 shrink-0" /><div className="flex-1"><Sk className="h-3 w-32 mb-1.5" /><Sk className="h-2.5 w-20" /></div><Sk className="h-4 w-16 ml-auto" /></div>
              ))}</div>
            ) : payouts.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-1">
                <p className="text-[12px] text-[#9CA3AF]">Sin payouts todavía</p>
                <p className="text-[11px] text-[#9CA3AF]">Aparecerán cuando tu balance sea suficiente</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {payouts.map((p) => {
                  const ps = PAYOUT_STATUS[p.status] ?? { label: p.status, icon: null, cls: "text-[#6B7280]" };
                  return (
                    <li key={p.id} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{ps.icon}</div>
                        <div>
                          <p className="text-[12px] font-medium text-[#0A0A0A]">{p.description ?? "Payout"}</p>
                          <p className="text-[11px] text-[#9CA3AF]">Llegada: {formatDate(p.arrivalDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(p.amount / 100, p.currency)}</p>
                        <p className={cn("text-[10px] font-medium", ps.cls)}>{ps.label}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Disputas */}
          <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">
            <div className="border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#0A0A0A]">Disputas</p>
              {openDisputes.length > 0 && (
                <span className="flex items-center gap-1.5 rounded-[6px] bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#991B1B]">
                  <AlertTriangle className="h-3 w-3" />{openDisputes.length} requieren respuesta
                </span>
              )}
            </div>
            {loading ? (
              <div className="divide-y divide-[#F3F4F6]">{[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5"><Sk className="h-4 w-4 shrink-0 rounded-full" /><div className="flex-1"><Sk className="h-3 w-32 mb-1.5" /><Sk className="h-2.5 w-20" /></div><Sk className="h-4 w-16 ml-auto" /></div>
              ))}</div>
            ) : disputes.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-1">
                <p className="text-[12px] text-[#9CA3AF]">Sin disputas</p>
                <p className="text-[11px] text-[#9CA3AF]">Cuando un cliente dispute un cobro, aparecerá aquí</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {disputes.slice(0, 4).map((d) => {
                  const ds     = DISPUTE_STATUS[d.status] ?? { label: d.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
                  const urgent = d.status === "needs_response" || d.status === "warning_needs_response";
                  return (
                    <li key={d.id} className={cn("flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors", urgent && "bg-red-50/40")}>
                      <div className="flex items-center gap-3">
                        {urgent ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" /> : <div className="h-4 w-4 shrink-0 rounded-full border border-[#E5E7EB]" />}
                        <div>
                          <p className="text-[12px] font-medium text-[#0A0A0A]">{d.customerName ?? "Cliente"}</p>
                          <p className="text-[11px] capitalize text-[#9CA3AF]">{d.reason.replace(/_/g, " ")}
                            {d.evidenceDueBy && <span className="ml-1.5 font-medium text-red-500">· Límite {formatDate(d.evidenceDueBy)}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(d.amount / 100, d.currency)}</p>
                        <span className={cn("inline-flex rounded-[4px] border px-1.5 py-0.5 text-[10px] font-semibold", ds.cls)}>{ds.label}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
