"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ShieldAlert, ShieldCheck, Activity,
  AlertTriangle, CheckCircle2, XCircle,
  Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  Eye, Ban, ChevronDown, ChevronUp, Loader2,
  Zap, Globe, Mail, CreditCard, Moon, Copy,
  Fingerprint, UserCheck, UserX, Clock, ExternalLink, Send,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RiskFlag  { code: string; label: string; points: number; detail?: string }
interface TitanStats {
  totalReviewed:      number;
  blocked:            number;
  highRisk:           number;
  avgScore:           number;
  alertsByDay:        { date: string; count: number }[];
  topFlags:           { code: string; label: string; count: number }[];
  severityBreakdown:  { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
}
interface AlertPayment {
  id: string; amount: number; currency: string; status: string;
  description: string | null; stripePaymentIntentId: string;
  customerEmail: string | null; customerName: string | null; createdAt: string;
}
interface TitanAlert {
  id: string; riskScore: number; severity: string; status: string;
  flags: RiskFlag[]; createdAt: string; payment: AlertPayment | null;
}
interface FraudRule {
  id: string; name: string; ruleType: string;
  params: Record<string, unknown>; riskPoints: number;
  action: string; isActive: boolean; createdAt: string;
}

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  LOW:      { label: "Bajo",     color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-400" },
  MEDIUM:   { label: "Medio",    color: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-400"   },
  HIGH:     { label: "Alto",     color: "#f97316", bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200",  dot: "bg-orange-400"  },
  CRITICAL: { label: "Crítico",  color: "#ef4444", bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     dot: "bg-red-500 animate-pulse" },
} as const;

const FLAG_ICONS: Record<string, React.ElementType> = {
  HIGH_AMOUNT:         CreditCard,
  HIGH_AMOUNT_CRITICAL:CreditCard,
  ROUND_AMOUNT:        CreditCard,
  NIGHT_PAYMENT:       Moon,
  HIGH_RISK_COUNTRY:   Globe,
  DISPOSABLE_EMAIL:    Mail,
  VELOCITY_EMAIL:      Zap,
  VELOCITY_EMAIL_HIGH: Zap,
  PRIOR_FAILURES:      AlertTriangle,
  PRIOR_FAILURES_HIGH: AlertTriangle,
  DUPLICATE_PAYMENT:   Copy,
  NO_DESCRIPTION:      Eye,
  ANONYMOUS_HIGH_VALUE:Eye,
};

const RULE_TYPE_LABELS: Record<string, string> = {
  AMOUNT_THRESHOLD: "Umbral de importe",
  VELOCITY:         "Velocidad",
  COUNTRY_BLOCK:    "Bloqueo de país",
  NIGHT_HOURS:      "Horario nocturno",
  EMAIL_DOMAIN:     "Dominio de email",
  CUSTOM:           "Personalizada",
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100", className)} />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.LOW;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", cfg.bg, cfg.text, cfg.ring)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#ef4444" : score >= 51 ? "#f97316" : score >= 21 ? "#f59e0b" : "#10b981";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-[17px] font-extrabold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ─── Panel KYC (Stripe Identity) ─────────────────────────────────────────────

const KYC_STATUS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  verified:        { label: "Verificado",    icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50"  },
  processing:      { label: "Procesando",    icon: Clock,     color: "text-blue-700",    bg: "bg-blue-50"     },
  requires_input:  { label: "Acción req.",   icon: AlertTriangle, color: "text-amber-700",  bg: "bg-amber-50"  },
  canceled:        { label: "Cancelada",     icon: UserX,     color: "text-slate-500",   bg: "bg-slate-50"    },
};

type KycSession = {
  id: string; status: string; type: string; created: number;
  url: string | null; lastError: string | null;
  metadata: Record<string, string>;
};

function KycPanel() {
  const [sessions, setSessions] = useState<KycSession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ customerEmail: "", customerName: "" });
  const [error,    setError]    = useState("");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/titan/kyc");
      if (r.ok) { const d = await r.json(); setSessions(d.sessions ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function createSession() {
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/titan/kyc", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          customerEmail: form.customerEmail,
          customerName:  form.customerName,
          returnUrl:     window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear sesión"); return; }
      if (data.url) window.open(data.url, "_blank");
      setShowForm(false);
      setForm({ customerEmail: "", customerName: "" });
      await loadSessions();
    } catch { setError("Error de red"); }
    finally { setCreating(false); }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Fingerprint className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Verificación de identidad (KYC)</p>
            <p className="text-[11px] text-slate-400">Powered by Stripe Identity · Documento + selfie</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSessions} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva verificación
          </button>
        </div>
      </div>

      {/* Formulario nueva sesión */}
      {showForm && (
        <div className="border-b border-slate-100 bg-indigo-50/40 px-6 py-5">
          <p className="text-[13px] font-semibold text-indigo-800 mb-4">Iniciar verificación de identidad</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nombre del cliente</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                placeholder="Ej. Juan García"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email del cliente</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                placeholder="cliente@email.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
          <p className="mt-2 text-[11px] text-slate-400">
            Se abrirá la verificación de Stripe. El cliente sube su documento y una selfie. El resultado aparecerá en esta lista.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={createSession}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {creating ? "Creando…" : "Iniciar verificación"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] text-slate-500 hover:bg-slate-50 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista sesiones */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Fingerprint className="h-10 w-10 text-slate-200 mb-3" />
          <p className="text-[14px] font-semibold text-slate-600">Sin verificaciones aún</p>
          <p className="text-[12px] text-slate-400 mt-1">Pulsa "Nueva verificación" para iniciar el proceso KYC de un cliente.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {sessions.map((s) => {
            const cfg = KYC_STATUS[s.status] ?? { label: s.status, icon: Clock, color: "text-slate-500", bg: "bg-slate-50" };
            const Icon = cfg.icon;
            return (
              <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                  <Icon className={cn("h-4 w-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    {s.metadata?.customerName && (
                      <span className="text-[13px] font-medium text-slate-700">{s.metadata.customerName}</span>
                    )}
                    {s.metadata?.customerEmail && (
                      <span className="text-[12px] text-slate-400">{s.metadata.customerEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-400">{s.id}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(s.created * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {s.lastError && (
                      <span className="text-[11px] text-red-500">{s.lastError}</span>
                    )}
                  </div>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100 transition shrink-0">
                    <ExternalLink className="h-3 w-3" /> Abrir
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TitanPage() {
  const [stats,         setStats]         = useState<TitanStats | null>(null);
  const [alerts,        setAlerts]        = useState<TitanAlert[]>([]);
  const [rules,         setRules]         = useState<FraudRule[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<"alerts" | "rules">("alerts");

  // ── Nueva regla ───────────────────────────────────────────────────────────
  const [showRuleForm,  setShowRuleForm]  = useState(false);
  const [ruleForm,      setRuleForm]      = useState({ name: "", ruleType: "AMOUNT_THRESHOLD", riskPoints: 20, action: "FLAG" });
  const [savingRule,    setSavingRule]    = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [s, a, r] = await Promise.all([
        fetch("/api/titan/stats").then(res => res.ok ? res.json() : null),
        fetch("/api/titan/alerts?limit=30").then(res => res.ok ? res.json() : null),
        fetch("/api/titan/rules").then(res => res.ok ? res.json() : null),
      ]);
      if (s) setStats(s as TitanStats);
      if (a?.data) setAlerts(a.data as TitanAlert[]);
      if (r)       setRules(r as FraudRule[]);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true).finally(() => setLoading(false));
    pollRef.current = setInterval(() => fetchData(true), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // ── Acciones de alertas ───────────────────────────────────────────────────
  async function updateAlert(alertId: string, status: string) {
    await fetch("/api/titan/alerts", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ alertId, status }),
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status } : a))
    );
  }

  // ── Toggle regla ──────────────────────────────────────────────────────────
  async function toggleRule(rule: FraudRule) {
    await fetch("/api/titan/rules", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
    });
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
  }

  async function deleteRule(id: string) {
    await fetch(`/api/titan/rules?id=${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveRule() {
    if (!ruleForm.name.trim()) return;
    setSavingRule(true);
    try {
      const res = await fetch("/api/titan/rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(ruleForm),
      });
      if (res.ok) {
        const r = await res.json() as FraudRule;
        setRules((prev) => [...prev, r]);
        setShowRuleForm(false);
        setRuleForm({ name: "", ruleType: "AMOUNT_THRESHOLD", riskPoints: 20, action: "FLAG" });
      }
    } finally {
      setSavingRule(false);
    }
  }

  // ── Métricas rápidas ──────────────────────────────────────────────────────
  const metricCards = [
    { label: "Pagos analizados", value: stats?.totalReviewed ?? 0, icon: Activity,     color: "text-slate-700",  bg: "bg-slate-50" },
    { label: "Bloqueados",       value: stats?.blocked ?? 0,       icon: Ban,          color: "text-red-600",    bg: "bg-red-50"   },
    { label: "Alto riesgo",      value: stats?.highRisk ?? 0,      icon: ShieldAlert,  color: "text-orange-600", bg: "bg-orange-50"},
    { label: "Score medio",      value: `${stats?.avgScore ?? 0}`, icon: ShieldCheck,  color: "text-indigo-600", bg: "bg-indigo-50"},
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] p-8">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div><Skeleton className="h-5 w-40 mb-1" /><Skeleton className="h-3 w-56" /></div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 md:p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-900">Titan</h1>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                v1.4.1
              </span>
              {/* Indicador live */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] text-slate-400">Activo</span>
              </div>
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Motor de Detección de Fraude · 10 señales de riesgo en tiempo real
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 transition"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{m.label}</p>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", m.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", m.color)} />
                </div>
              </div>
              <p className="text-[28px] font-extrabold tabular-nums text-slate-900">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── KYC + Top señales ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Score promedio */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center gap-4">
          <p className="text-[13px] font-semibold text-slate-800 self-start">Score de riesgo medio</p>
          <ScoreGauge score={stats?.avgScore ?? 0} />
          <div className="text-center">
            <p className="text-[12px] font-semibold text-slate-700">últimos 30 días</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats?.totalReviewed ?? 0} pagos analizados</p>
          </div>
          <div className="w-full space-y-1.5">
            {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map((sev) => {
              const cfg   = SEVERITY_CONFIG[sev];
              const count = stats?.severityBreakdown[sev] ?? 0;
              return (
                <div key={sev} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot.replace(" animate-pulse",""))} />
                  <span className="text-[11px] text-slate-500 flex-1">{cfg.label}</span>
                  <span className="text-[11px] font-bold text-slate-700 tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top señales + distribución */}
        <div className="lg:col-span-3 space-y-4">

          {/* Top señales más frecuentes */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-semibold text-slate-800 mb-4">Señales más frecuentes</p>
            {(stats?.topFlags ?? []).length === 0 ? (
              <p className="text-[12px] text-slate-400 text-center py-4">Sin alertas suficientes</p>
            ) : (
              <div className="space-y-2">
                {(stats?.topFlags ?? []).map((f) => {
                  const Icon = FLAG_ICONS[f.code] ?? ShieldAlert;
                  const max  = stats!.topFlags[0].count;
                  const pct  = Math.round((f.count / max) * 100);
                  return (
                    <div key={f.code} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-slate-700 truncate">{f.label}</p>
                        <div className="mt-0.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[12px] font-bold tabular-nums text-slate-600 shrink-0">{f.count}×</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KYC Panel ───────────────────────────────────────────────────────── */}
      <KycPanel />

      {/* ── Tabs: Alertas / Reglas ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-slate-100">
          {([
            { key: "alerts", label: `Alertas recientes${alerts.length ? ` (${alerts.length})` : ""}` },
            { key: "rules",  label: `Reglas activas (${rules.filter(r => r.isActive).length}/${rules.length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-6 py-3.5 text-[13px] font-semibold border-b-2 transition-colors",
                activeTab === key
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB ALERTAS ──────────────────────────────────────────────────── */}
        {activeTab === "alerts" && (
          <div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <ShieldCheck className="h-10 w-10 text-emerald-400 mb-3" />
                <p className="text-[15px] font-semibold text-slate-700">Sin alertas</p>
                <p className="text-[12px] text-slate-400 mt-1">Titan analizará los próximos pagos automáticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {alerts.map((a) => {
                  const expanded = expandedAlert === a.id;
                  const isDismissed = a.status === "DISMISSED" || a.status === "REVIEWED";
                  return (
                    <div key={a.id} className={cn("transition-colors", isDismissed && "opacity-50")}>
                      <div
                        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50/70"
                        onClick={() => setExpandedAlert(expanded ? null : a.id)}
                      >
                        {/* Score gauge mini */}
                        <div className="shrink-0">
                          <ScoreGauge score={a.riskScore} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityBadge severity={a.severity} />
                            {a.status === "BLOCKED"  && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Bloqueado</span>}
                            {a.status === "REVIEWED" && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">Revisado</span>}
                            {a.status === "DISMISSED"&& <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">Descartado</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                            {a.payment && (
                              <>
                                <span className="font-semibold text-slate-700">
                                  {formatCurrency(a.payment.amount / 100, a.payment.currency)}
                                </span>
                                {a.payment.customerEmail && <span className="truncate max-w-[160px]">{a.payment.customerEmail}</span>}
                                <span className="font-mono text-[10px]">{a.payment.stripePaymentIntentId.slice(0, 16)}…</span>
                              </>
                            )}
                            <span>{formatDate(a.createdAt)}</span>
                          </div>
                          {/* Flags resumidos */}
                          <div className="flex flex-wrap gap-1">
                            {a.flags.slice(0, 3).map((f) => (
                              <span key={f.code} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                {f.label}
                              </span>
                            ))}
                            {a.flags.length > 3 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
                                +{a.flags.length - 3} más
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones rápidas */}
                        <div className="flex items-center gap-2 shrink-0">
                          {a.status === "FLAGGED" && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateAlert(a.id, "REVIEWED"); }}
                                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> OK
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateAlert(a.id, "DISMISSED"); }}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Descartar
                              </button>
                            </>
                          )}
                          {expanded
                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                          }
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {expanded && (
                        <div className="px-6 pb-5 pt-1 bg-slate-50/60 border-t border-slate-100">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Señales detectadas</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {a.flags.map((f) => {
                              const Icon = FLAG_ICONS[f.code] ?? ShieldAlert;
                              return (
                                <div key={f.code} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50">
                                    <Icon className="h-3.5 w-3.5 text-red-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-slate-800">{f.label}</p>
                                    {f.detail && <p className="text-[11px] text-slate-500 mt-0.5">{f.detail}</p>}
                                    <p className="text-[10px] font-bold text-red-600 mt-0.5">+{f.points} pts</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB REGLAS ───────────────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <p className="text-[12px] text-slate-400">
                Personaliza los umbrales de detección. Las reglas activas se aplican en tiempo real.
              </p>
              <button
                onClick={() => setShowRuleForm(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Nueva regla
              </button>
            </div>

            {/* Formulario nueva regla */}
            {showRuleForm && (
              <div className="border-b border-slate-100 bg-indigo-50/50 px-6 py-5">
                <p className="text-[13px] font-semibold text-indigo-800 mb-4">Nueva regla de detección</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <input
                    placeholder="Nombre de la regla"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))}
                    className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={ruleForm.ruleType}
                    onChange={(e) => setRuleForm((p) => ({ ...p, ruleType: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={ruleForm.action}
                    onChange={(e) => setRuleForm((p) => ({ ...p, action: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FLAG">Marcar (FLAG)</option>
                    <option value="BLOCK">Bloquear (BLOCK)</option>
                  </select>
                  <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                    <label className="text-[12px] text-slate-600 shrink-0">Puntos de riesgo:</label>
                    <input
                      type="number"
                      min="1" max="100"
                      value={ruleForm.riskPoints}
                      onChange={(e) => setRuleForm((p) => ({ ...p, riskPoints: Number(e.target.value) }))}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={saveRule}
                    disabled={savingRule || !ruleForm.name.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {savingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Guardar regla
                  </button>
                  <button
                    onClick={() => setShowRuleForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] text-slate-500 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {rules.length === 0 && !showRuleForm ? (
              <div className="flex flex-col items-center py-14 text-center">
                <ShieldAlert className="h-8 w-8 text-indigo-300 mb-3" />
                <p className="text-[14px] font-semibold text-slate-700">Sin reglas personalizadas</p>
                <p className="text-[12px] text-slate-400 mt-1">El motor aplica las señales por defecto. Añade reglas para ajustar la sensibilidad.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {rules.map((rule) => (
                  <div key={rule.id} className={cn("flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/40", !rule.isActive && "opacity-50")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-800">{rule.name}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                        </span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          rule.action === "BLOCK"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700",
                        )}>
                          {rule.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">+{rule.riskPoints} pts · creada {formatDate(rule.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleRule(rule)} className="text-slate-400 hover:text-slate-700 transition">
                        {rule.isActive
                          ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                          : <ToggleLeft  className="h-6 w-6 text-slate-300" />
                        }
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info señales built-in */}
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Señales integradas (siempre activas)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { icon: CreditCard,  label: "Importe elevado (≥1.000€)",         pts: "+15 pts" },
                  { icon: CreditCard,  label: "Importe muy elevado (≥3.000€)",     pts: "+30 pts" },
                  { icon: CreditCard,  label: "Importe redondo (múltiplo de 100)", pts: "+8 pts"  },
                  { icon: Moon,        label: "Horario nocturno (00–06h UTC)",      pts: "+12 pts" },
                  { icon: Globe,       label: "País de alto riesgo",               pts: "+20 pts" },
                  { icon: Mail,        label: "Email desechable",                   pts: "+25 pts" },
                  { icon: Zap,         label: "Múltiples pagos mismo email (1h)",  pts: "+10–25"  },
                  { icon: AlertTriangle, label: "Intentos fallidos previos",       pts: "+12–30"  },
                  { icon: Copy,        label: "Pago duplicado (<5 min)",            pts: "+35 pts" },
                  { icon: Eye,         label: "Pago elevado sin datos de cliente", pts: "+10 pts" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-[11px] text-slate-600 truncate">{s.label}</span>
                      <span className="ml-auto text-[10px] font-bold text-indigo-600 shrink-0">{s.pts}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Leyenda de umbrales ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Umbrales de riesgo</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const ranges = { LOW: "0–20", MEDIUM: "21–50", HIGH: "51–79", CRITICAL: "80–100" };
            const actions = {
              LOW:      "Informativo — sin acción requerida",
              MEDIUM:   "Marcar para revisión manual",
              HIGH:     "Requiere verificación adicional",
              CRITICAL: "Bloqueo automático del pago",
            };
            return (
              <div key={sev} className={cn("rounded-xl border p-3", cfg.bg, cfg.ring.replace("ring-", "border-"))}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot.replace(" animate-pulse", ""))} />
                  <span className={cn("text-[12px] font-bold", cfg.text)}>{cfg.label} · {ranges[sev]}</span>
                </div>
                <p className={cn("text-[11px]", cfg.text, "opacity-80")}>{actions[sev]}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
