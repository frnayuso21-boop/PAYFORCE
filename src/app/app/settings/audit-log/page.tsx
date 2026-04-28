"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, LogIn, LogOut, AlertTriangle,
  Settings, CreditCard, RefreshCw, Shield,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface LogEntry {
  id:         string;
  action:     string;
  resource:   string;
  resourceId: string | null;
  ipAddress:  string | null;
  userAgent:  string | null;
  metadata:   Record<string, unknown> | null;
  createdAt:  string;
}

// ── Configuración visual por acción ──────────────────────────────────────────
const ACTION_CONFIG: Record<string, {
  label: string;
  icon:  React.ReactNode;
  bg:    string;
  text:  string;
}> = {
  LOGIN_SUCCESS:    { label: "Inicio de sesión",       icon: <LogIn    className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  LOGIN_FAILED:     { label: "Intento fallido",         icon: <AlertTriangle className="h-3.5 w-3.5" />, bg: "#FEE2E2", text: "#991B1B" },
  LOGOUT:           { label: "Cierre de sesión",        icon: <LogOut   className="h-3.5 w-3.5" />, bg: "#F1F5F9", text: "#475569" },
  "2FA_ENABLED":    { label: "2FA activado",            icon: <ShieldCheck className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  "2FA_DISABLED":   { label: "2FA desactivado",         icon: <ShieldCheck className="h-3.5 w-3.5" />, bg: "#FEF3C7", text: "#92400E" },
  "2FA_FAILED":     { label: "Código 2FA incorrecto",   icon: <Shield   className="h-3.5 w-3.5" />, bg: "#FEE2E2", text: "#991B1B" },
  "2FA_SUCCESS":    { label: "Verificación 2FA",        icon: <ShieldCheck className="h-3.5 w-3.5" />, bg: "#EAF3DE", text: "#27500A" },
  PASSWORD_CHANGED: { label: "Contraseña cambiada",     icon: <Settings className="h-3.5 w-3.5" />, bg: "#EFF6FF", text: "#1D4ED8" },
  PAYMENT_REFUNDED: { label: "Reembolso procesado",     icon: <CreditCard className="h-3.5 w-3.5" />, bg: "#EFF6FF", text: "#1D4ED8" },
  SETTINGS_CHANGED: { label: "Configuración cambiada",  icon: <Settings className="h-3.5 w-3.5" />, bg: "#F1F5F9", text: "#475569" },
  PAYMENT_LINK_CREATED: { label: "Enlace de pago creado", icon: <CreditCard className="h-3.5 w-3.5" />, bg: "#F5F3FF", text: "#5B21B6" },
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

// ── Página ────────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0);
  const LIMIT = 50;

  async function load(off = 0) {
    setLoading(true);
    try {
      const r = await fetch(`/api/auth/audit-log?limit=${LIMIT}&offset=${off}`);
      if (!r.ok) return;
      const d = await r.json() as { logs: LogEntry[]; total: number };
      setLogs(off === 0 ? d.logs : (prev) => [...prev, ...d.logs]);
      setTotal(d.total);
      setOffset(off + LIMIT);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0); }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">Log de auditoría</h1>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Registro de todas las acciones de seguridad de tu cuenta.
            </p>
          </div>
          <button
            onClick={() => load(0)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Cabecera */}
          <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.2fr" }}>
            <span>Acción</span>
            <span>IP</span>
            <span>Dispositivo</span>
            <span>Recurso</span>
            <span className="text-right">Fecha</span>
          </div>

          {loading && logs.length === 0 ? (
            <div className="divide-y divide-slate-50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid items-center px-5 py-3.5"
                  style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.2fr" }}>
                  <div className="h-5 w-28 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
                  <div className="h-3.5 w-12 animate-pulse rounded bg-slate-100" />
                  <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100 ml-auto" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-[14px] font-medium text-slate-500">Sin registros todavía</p>
              <p className="mt-1 text-[12px] text-slate-400">
                Las acciones de seguridad aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid items-center px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                  style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.2fr" }}
                >
                  <ActionBadge action={log.action} />
                  <span className="font-mono text-[11px] text-slate-500">
                    {log.ipAddress ?? "—"}
                  </span>
                  <span className="text-[12px] text-slate-500">
                    {formatUA(log.userAgent)}
                  </span>
                  <span className="text-[12px] text-slate-400 truncate">
                    {log.resourceId ? log.resourceId.slice(0, 12) + "…" : log.resource}
                  </span>
                  <span className="text-right font-mono text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString("es-ES", {
                      day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer con total + cargar más */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-[12px] text-slate-400">
                {logs.length} de {total} evento{total !== 1 ? "s" : ""}
              </p>
              {logs.length < total && (
                <button
                  onClick={() => load(offset)}
                  className="text-[12px] font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Cargar más →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
