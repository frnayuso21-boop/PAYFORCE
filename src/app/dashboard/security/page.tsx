"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, LogIn, AlertTriangle,
  Settings, CreditCard, Shield,
} from "lucide-react";

interface LogEntry {
  id:         string;
  action:     string;
  resource:   string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata:   Record<string, unknown> | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, {
  label: string;
  icon:  React.ReactNode;
  bg:    string;
  text:  string;
}> = {
  LOGIN_SUCCESS:        { label: "Inicio de sesión",      icon: <LogIn className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  LOGIN_FAILED:         { label: "Intento fallido",       icon: <AlertTriangle className="h-3.5 w-3.5" />, bg: "#FEE2E2", text: "#991B1B" },
  MFA_SUCCESS:          { label: "Verificación MFA",      icon: <ShieldCheck className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  "2FA_ENABLED":        { label: "2FA activado",          icon: <ShieldCheck className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  "2FA_DISABLED":       { label: "2FA desactivado",       icon: <Shield className="h-3.5 w-3.5" />, bg: "#FEF3C7", text: "#92400E" },
  PAYMENT_LINK_CREATED: { label: "Enlace de pago creado", icon: <CreditCard className="h-3.5 w-3.5" />, bg: "#F5F3FF", text: "#5B21B6" },
  PAYMENT_REFUNDED:     { label: "Reembolso procesado",   icon: <CreditCard className="h-3.5 w-3.5" />, bg: "#EFF6FF", text: "#1D4ED8" },
  SETTINGS_CHANGED:     { label: "Configuración cambiada", icon: <Settings className="h-3.5 w-3.5" />, bg: "#F1F5F9", text: "#475569" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? {
    label: action, icon: null, bg: "#F1F5F9", text: "#475569",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.icon}{cfg.label}
    </span>
  );
}

function formatUA(ua: string | null): string {
  if (!ua) return "—";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua))     return "Android";
  if (/Mac/.test(ua))         return "Mac";
  if (/Windows/.test(ua))     return "Windows";
  if (/Linux/.test(ua))       return "Linux";
  return ua.slice(0, 30) + "…";
}

export default function DashboardSecurityActivityPage() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0);
  const LIMIT = 50;

  async function load(off = 0) {
    setLoading(true);
    try {
      const r = await fetch(`/api/auth/supabase-security-audit?limit=${LIMIT}&offset=${off}`);
      if (!r.ok) return;
      const d = await r.json() as { logs: LogEntry[]; total: number };
      setLogs(off === 0 ? d.logs : (prev) => [...prev, ...d.logs]);
      setTotal(d.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(0); }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">Actividad de seguridad</h1>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Eventos recientes registrados en Supabase (MFA, pagos, ajustes).
            </p>
          </div>
          <Link
            href="/app/settings/security"
            className="text-[13px] font-medium text-[#0071e3] hover:underline"
          >
            ← Volver a seguridad
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-600">Acción</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Recurso</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">IP</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Dispositivo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No hay actividad registrada todavía.
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3"><ActionBadge action={row.action} /></td>
                      <td className="px-4 py-3 text-slate-600">{row.resource ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{row.ip_address ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatUA(row.user_agent)}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString("es-ES")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {logs.length < total && (
            <div className="border-t border-slate-100 px-4 py-3 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const next = offset + LIMIT;
                  setOffset(next);
                  void load(next);
                }}
                className="text-[13px] font-medium text-[#0071e3] hover:underline disabled:opacity-50"
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Requiere la tabla <code className="rounded bg-slate-100 px-1">auth_security_audit</code> en Supabase y{" "}
          <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> en el servidor para registrar eventos.
        </p>
      </div>
    </div>
  );
}
