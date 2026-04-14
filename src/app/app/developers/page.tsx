"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, CheckCircle2,
  Loader2, AlertCircle, Terminal, ExternalLink, Clock,
  Shield, Code2, Zap, RefreshCw, X,
} from "lucide-react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ApiKey {
  id:          string;
  label:       string;
  keyPrefix:   string;
  isActive:    boolean;
  lastUsedAt:  string | null;
  expiresAt:   string | null;
  createdAt:   string;
}

// ─── Crea API key modal ───────────────────────────────────────────────────────
function CreateKeyModal({ onClose, onCreate }: {
  onClose:  () => void;
  onCreate: (k: ApiKey, token: string) => void;
}) {
  const [label,   setLabel]   = useState("Mi integración");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res  = await fetch("/api/api-keys", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ label }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error ?? "Error al crear la key");
    onCreate({ id: json.id, label: json.label, keyPrefix: json.keyPrefix, isActive: true, lastUsedAt: null, expiresAt: null, createdAt: json.createdAt }, json.token);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Key className="h-4 w-4 text-white"/>
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900">Nueva API key</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">
              <AlertCircle className="h-3.5 w-3.5"/>{error}
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Nombre de la key</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ej. Producción, Backend, Migración…"
              maxLength={80}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-700 mb-1">⚠ Solo se muestra una vez</p>
            <p className="text-[11px] text-amber-600">El token completo solo se muestra al crearlo. Cópialo en un lugar seguro inmediatamente.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !label.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 transition"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Creando…</> : <><Plus className="h-4 w-4"/>Crear key</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Token reveal modal ───────────────────────────────────────────────────────
function TokenRevealModal({ token, label, onClose }: { token: string; label: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-5 w-5 text-white"/>
            <h2 className="text-[16px] font-bold text-white">API key creada: {label}</h2>
          </div>
          <p className="text-[12px] text-white/70">Copia este token ahora. No podrás verlo de nuevo.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <code className="flex-1 text-[12px] font-mono text-slate-800 break-all">{token}</code>
            <button onClick={copy}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                copied ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              )}>
              {copied ? <><CheckCircle2 className="inline h-3 w-3 mr-1"/>Copiado</> : <><Copy className="inline h-3 w-3 mr-1"/>Copiar</>}
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0"/>
            <div>
              <p className="text-[12px] font-semibold text-amber-700">Guárdala en un lugar seguro</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Esta key tiene acceso completo a tu cuenta PayForce. Nunca la compartas ni la pongas en código frontend.</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Entendido, ya la copié
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DevelopersPage() {
  const [keys,        setKeys]        = useState<ApiKey[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newToken,    setNewToken]    = useState<{ token: string; label: string } | null>(null);
  const [toast,       setToast]       = useState("");
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [showPrefix,  setShowPrefix]  = useState<Record<string, boolean>>({});

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/api-keys");
    if (res.ok) {
      const j = await res.json();
      setKeys(j.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function revokeKey(id: string, label: string) {
    if (!confirm(`¿Revocar la key "${label}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setKeys(prev => prev.filter(k => k.id !== id));
      showToast("API key revocada");
    }
  }

  function handleCreated(k: ApiKey, token: string) {
    setKeys(prev => [k, ...prev]);
    setShowCreate(false);
    setNewToken({ token, label: k.label });
  }

  const ENDPOINTS = [
    { method: "GET",  path: "/api/v1/payments",  desc: "Lista pagos" },
    { method: "POST", path: "/api/v1/payments",  desc: "Crea un pago" },
    { method: "GET",  path: "/api/v1/customers", desc: "Lista clientes" },
    { method: "POST", path: "/api/v1/customers", desc: "Crea un cliente" },
    { method: "GET",  path: "/api/v1/invoices",  desc: "Lista facturas" },
    { method: "POST", path: "/api/migrate",       desc: "Migrar desde Stripe/LemonSqueezy" },
  ];

  const methodCls: Record<string, string> = {
    GET:  "bg-emerald-50 text-emerald-700",
    POST: "bg-blue-50 text-blue-700",
    PUT:  "bg-amber-50 text-amber-700",
  };

  return (
    <div className="min-h-full space-y-6 p-6 lg:p-8">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[13px] text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400"/>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Desarrolladores</h1>
          <p className="text-sm text-slate-400 mt-0.5">API keys, documentación y herramientas de integración</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/developers" target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition">
            <ExternalLink className="h-3.5 w-3.5"/>Documentación completa
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-md"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <Plus className="h-4 w-4"/>Nueva API key
          </button>
        </div>
      </div>

      {/* Quick start */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-indigo-400"/>
            <h2 className="text-[14px] font-bold text-white">Quick start</h2>
          </div>
          <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto" style={{ color: "#e6edf3" }}>
{`curl https://payforce.io/api/v1/payments \\
  -H "Authorization: Bearer pf_live_YOUR_KEY"`}
          </pre>
        </div>
        <div className="border-t px-6 py-3 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Shield className="h-3 w-3 text-emerald-400"/> TLS 1.3</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Code2 className="h-3 w-3 text-blue-400"/> REST + JSON</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Zap className="h-3 w-3 text-amber-400"/> &lt;150ms p95</div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v1 · 2025-01</span>
        </div>
      </div>

      {/* Grid: API keys + endpoints */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* API Keys */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-400"/>
              <h2 className="text-[14px] font-semibold text-slate-800">API Keys</h2>
              <span className="text-[11px] text-slate-400">({keys.length} / 20)</span>
            </div>
            <button onClick={loadKeys} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")}/>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300"/>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <Key className="h-8 w-8 text-slate-200"/>
              <p className="text-[13px]">Sin API keys. Crea la primera para integrar PayForce.</p>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                <Plus className="h-3.5 w-3.5"/>Crear API key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {keys.map(k => (
                <div key={k.id} className="flex items-center gap-4 px-6 py-4 group hover:bg-slate-50/70 transition">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: k.isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#f1f5f9" }}>
                    <Key className={cn("h-3.5 w-3.5", k.isActive ? "text-white" : "text-slate-400")}/>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{k.label}</p>
                      {!k.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Revocada</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <code className="text-[11px] font-mono text-slate-400">
                        {showPrefix[k.id] ? k.keyPrefix : k.keyPrefix.slice(0, 12) + "••••••••"}
                      </code>
                      <button onClick={() => setShowPrefix(p => ({ ...p, [k.id]: !p[k.id] }))}>
                        {showPrefix[k.id]
                          ? <EyeOff className="h-3 w-3 text-slate-300"/>
                          : <Eye     className="h-3 w-3 text-slate-300"/>}
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {k.lastUsedAt
                      ? <p className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3"/>{formatDate(k.lastUsedAt)}</p>
                      : <p className="text-[11px] text-slate-300">Sin uso aún</p>}
                    <p className="text-[10px] text-slate-300 mt-0.5">Creada {formatDate(k.createdAt)}</p>
                  </div>

                  <button
                    onClick={() => revokeKey(k.id, k.label)}
                    disabled={deletingId === k.id || !k.isActive}
                    className="opacity-0 group-hover:opacity-100 shrink-0 rounded-lg border border-red-100 p-2 text-red-400 hover:bg-red-50 transition disabled:opacity-20"
                    title="Revocar"
                  >
                    {deletingId === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5"/>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Endpoints */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Terminal className="h-4 w-4 text-slate-400"/>
            <h2 className="text-[14px] font-semibold text-slate-800">Endpoints disponibles</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {ENDPOINTS.map(ep => (
              <div key={ep.path + ep.method} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0", methodCls[ep.method] ?? "bg-slate-100 text-slate-500")}>
                  {ep.method}
                </span>
                <code className="flex-1 text-[11px] font-mono text-slate-600 truncate">{ep.path}</code>
                <span className="text-[10px] text-slate-400 shrink-0">{ep.desc}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-50">
            <Link href="/developers" target="_blank"
              className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition">
              <ExternalLink className="h-3.5 w-3.5"/>Ver documentación completa
            </Link>
          </div>
        </div>
      </div>

      {/* Migration tool */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <Zap className="h-5 w-5 text-white"/>
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-slate-900 mb-1">Migra desde Stripe o Lemon Squeezy</h3>
            <p className="text-[13px] text-slate-600 mb-3">
              Importa clientes, productos y pagos históricos en minutos con nuestro CLI oficial.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-xl border border-indigo-200 bg-white px-4 py-2">
                <code className="text-[12px] font-mono text-indigo-700">npx payforce-migrate</code>
              </div>
              <Link href="/developers#migrate" target="_blank"
                className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                Ver docs <ExternalLink className="h-3 w-3"/>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
      {newToken   && <TokenRevealModal token={newToken.token} label={newToken.label} onClose={() => setNewToken(null)} />}

    </div>
  );
}
