"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Link2, Copy, CheckCheck, Plus, XCircle,
  Clock, CheckCircle2, AlertTriangle, ExternalLink,
  MessageCircle, Bell, BellOff, Send,
} from "lucide-react";
import { Button }         from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PaymentLink {
  id:                    string;
  token:                 string;
  url:                   string;
  amount:                number;
  currency:              string;
  applicationFeeAmount:  number;
  status:                string;
  description:           string | null;
  customerEmail:         string | null;
  customerName:          string | null;
  maxUses:               number;
  usedCount:             number;
  expiresAt:             string | null;
  createdAt:             string;
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; icon: React.ReactNode; dot: string; badge: string }> = {
  open: {
    label: "Activo",
    icon:  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />,
    dot:   "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  paid: {
    label: "Pagado",
    icon:  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    dot:   "bg-emerald-300",
    badge: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  expired: {
    label: "Expirado",
    icon:  <Clock className="h-3.5 w-3.5 text-amber-400" />,
    dot:   "bg-amber-300",
    badge: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  canceled: {
    label: "Cancelado",
    icon:  <XCircle className="h-3.5 w-3.5 text-slate-400" />,
    dot:   "bg-slate-300",
    badge: "bg-slate-50 text-slate-400 ring-slate-100",
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.open;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
      s.badge
    )}>
      {s.icon}
      {s.label}
    </span>
  );
}

// Copia con fallback para HTTP (IP de red en desarrollo)
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback: textarea + execCommand (funciona en HTTP)
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      {copied
        ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-500" />Copiado</>
        : <><Copy className="h-3.5 w-3.5" />Copiar</>
      }
    </button>
  );
}

// ─── Modal de creación ────────────────────────────────────────────────────────

// ─── Tipo de producto ──────────────────────────────────────────────────────────
interface Product { id: string; name: string; price: number; currency: string; description: string | null }

function CreateModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ url: string } | null>(null);

  const [form, setForm] = useState({
    amount:          "",
    currency:        "eur",
    description:     "",
    customerName:    "",
    customerEmail:   "",
    customerPhone:   "",
    expiresAt:       "",
    reminderEnabled: false,
  });

  // ── Selector de producto ──────────────────────────────────────────────────
  const [products,       setProducts]       = useState<Product[]>([]);
  const [productMode,    setProductMode]    = useState<"select" | "new" | "none">("none");
  const [selectedProduct,setSelectedProduct]= useState<string>("");
  const [newProdName,    setNewProdName]    = useState("");
  const [newProdPrice,   setNewProdPrice]   = useState("");
  const [newProdDesc,    setNewProdDesc]    = useState("");
  const [prodLoading,    setProdLoading]    = useState(false);

  useEffect(() => {
    fetch("/api/products").then((r) => r.ok ? r.json() : null).then((d: { products?: Product[] } | null) => {
      if (d?.products) setProducts(d.products);
    }).catch(() => null);
  }, []);

  function handleSelectProduct(id: string) {
    setSelectedProduct(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setForm((f) => ({
        ...f,
        amount:      (prod.price / 100).toFixed(2),
        currency:    prod.currency,
        description: prod.name,
      }));
    }
  }

  async function handleCreateProduct() {
    const priceNum = Number(newProdPrice);
    if (!newProdName.trim() || !priceNum || priceNum < 0.50) {
      setError("Nombre y precio válidos (mín. 0,50€) son obligatorios");
      return;
    }
    setProdLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProdName.trim(), price: Math.round(priceNum * 100), description: newProdDesc || undefined }),
      });
      const resp = await res.json() as { product?: Product; error?: string };
      if (!res.ok) throw new Error(resp.error ?? "Error al crear el producto");
      const newProd = resp.product!;
      setProducts((prev) => [newProd, ...prev]);
      handleSelectProduct(newProd.id);
      setProductMode("select");
      setSelectedProduct(newProd.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setProdLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amountCents = Math.round(Number(form.amount) * 100);
    if (!amountCents || amountCents < 50) {
      setError("El importe mínimo es €0,50");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:          amountCents,
          currency:        form.currency,
          description:     form.description  || undefined,
          customerName:    form.customerName  || undefined,
          customerEmail:   form.customerEmail || undefined,
          customerPhone:   form.customerPhone || undefined,
          expiresAt:       form.expiresAt     || undefined,
          reminderEnabled: form.reminderEnabled,
        }),
      });

      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al crear el link");

      setResult({ url: data.url! });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Nuevo enlace de pago</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">Genera un link para cobrar al instante</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 active:bg-slate-100">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">Link creado correctamente</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[11px] text-slate-400">URL del pago</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">{result.url}</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1.5 rounded-xl"
                onClick={() => copyToClipboard(result.url)}
              >
                <Copy className="h-4 w-4" />
                Copiar URL
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 rounded-xl"
                onClick={() => window.open(result.url, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
            </div>
            <button onClick={onClose} className="w-full text-center text-sm text-slate-400 hover:text-slate-600">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Selector de producto ───────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Producto</p>
              <div className="flex gap-3">
                {[
                  { key: "none",   label: "Sin producto"    },
                  { key: "select", label: "Existente"       },
                  { key: "new",    label: "+ Crear producto" },
                ].map((opt) => (
                  <button key={opt.key} type="button"
                    onClick={() => setProductMode(opt.key as "none" | "select" | "new")}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                    style={productMode === opt.key
                      ? { background: "#0A0A0A", color: "#fff" }
                      : { background: "#fff", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {productMode === "select" && (
                <select value={selectedProduct} onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10">
                  <option value="">— Selecciona un producto —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {(p.price / 100).toLocaleString("es-ES", { style: "currency", currency: p.currency.toUpperCase() })}
                    </option>
                  ))}
                </select>
              )}

              {productMode === "new" && (
                <div className="space-y-2">
                  <input type="text" placeholder="Nombre del producto"
                    value={newProdName} onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10" />
                  <div className="flex gap-2">
                    <div className="flex flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-slate-900/10">
                      <span className="flex items-center pl-3 text-[13px] text-slate-400">€</span>
                      <input type="number" min="0.50" step="0.01" placeholder="0,00"
                        value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)}
                        className="flex-1 px-2 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-300" />
                    </div>
                    <input type="text" placeholder="Descripción (opcional)"
                      value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10" />
                  </div>
                  <button type="button" onClick={() => void handleCreateProduct()} disabled={prodLoading}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40">
                    {prodLoading ? "Creando…" : "+ Crear y usar este producto"}
                  </button>
                </div>
              )}
            </div>

            {/* Importe */}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Importe</label>
              <div className="flex rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900/10">
                <span className="flex items-center pl-4 text-sm text-slate-400">€</span>
                <input
                  type="number"
                  min="0.50"
                  step="0.01"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={set("amount")}
                  required
                  className="flex-1 rounded-xl bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300"
                />
                <select
                  value={form.currency}
                  onChange={set("currency")}
                  className="rounded-r-xl border-l border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 outline-none"
                >
                  <option value="eur">EUR</option>
                  <option value="usd">USD</option>
                  <option value="gbp">GBP</option>
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Descripción</label>
              <input
                type="text"
                placeholder="Ej: Factura #001 · Consultoría"
                value={form.description}
                onChange={set("description")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Nombre cliente</label>
                <input
                  type="text"
                  placeholder="Ana García"
                  value={form.customerName}
                  onChange={set("customerName")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  placeholder="ana@email.com"
                  value={form.customerEmail}
                  onChange={set("customerEmail")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Teléfono WhatsApp <span className="text-slate-400">(opcional)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 text-xs select-none">+34</span>
                <input
                  type="tel"
                  placeholder="612 345 678"
                  value={form.customerPhone}
                  onChange={set("customerPhone")}
                  className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            {/* Expiración */}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Fecha de expiración <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={set("expiresAt")}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {/* Recordatorios automáticos */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
              <input
                type="checkbox"
                checked={form.reminderEnabled}
                onChange={(e) => setForm((p) => ({ ...p, reminderEnabled: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-[13px] text-slate-600 leading-snug">
                <span className="font-medium text-slate-800">Activar recordatorios automáticos</span>
                <br/>
                <span className="text-[11px] text-slate-400">Email al cliente a los 3, 7 y 14 días si no paga.</span>
              </span>
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 rounded-xl py-2.5"
            >
              {loading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Creando…</>
                : <><Plus className="h-4 w-4" />Crear Payment Link</>
              }
            </Button>
          </form>
        )}
    </div>
  );
}

// ─── Recordatorios (Impagos) ──────────────────────────────────────────────────

interface PaymentReminderRow {
  id:            string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName:  string | null;
  amount:        number;
  currency:      string;
  status:        string;
  remindersSent: number;
  createdAt:     string;
  paymentLink:   { token: string; description: string | null };
}

const REMINDER_STATUS: Record<string, { label: string; badge: string }> = {
  pending:   { label: "Pendiente",  badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  paid:      { label: "Pagado",     badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  expired:   { label: "Expirado",   badge: "bg-slate-50 text-slate-500 ring-slate-200" },
  cancelled: { label: "Cancelado",  badge: "bg-slate-50 text-slate-400 ring-slate-100" },
};

function RemindersTab() {
  const [reminders, setReminders] = useState<PaymentReminderRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState<string | null>(null);

  const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://payforce.co";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reminders");
    if (res.ok) {
      const json = await res.json() as { reminders: PaymentReminderRow[] };
      setReminders(json.reminders);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "send" | "cancel") => {
    setActing(id + action);
    await fetch("/api/reminders", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, action }),
    });
    await load();
    setActing(null);
  };

  const openWhatsApp = (r: PaymentReminderRow) => {
    const url   = `${APP}/pay/${r.paymentLink.token}`;
    const fmt   = new Intl.NumberFormat("es-ES", { style: "currency", currency: r.currency }).format(r.amount / 100);
    const name  = r.customerName ? ` ${r.customerName}` : "";
    const msg   = encodeURIComponent(`Hola${name}! Tienes un pago pendiente de ${fmt} por ${r.paymentLink.description ?? "tu pedido"}:\n\n${url}\n\nPuedes pagar de forma segura con tarjeta. Gracias!`);
    const phone = r.customerPhone?.replace(/\s+/g, "").replace(/^\+/, "") ?? "";
    window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  };

  if (loading) return (
    <div className="space-y-2 py-4">
      {[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
    </div>
  );

  if (reminders.length === 0) return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
      <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-[14px] font-semibold text-slate-600">Sin recordatorios</p>
      <p className="mt-1 text-[12px] text-slate-400">Los recordatorios se crean al activar la opción en el formulario de nuevo link.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Cliente", "Importe", "Creado", "Recordatorios", "Estado", "Acciones"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {reminders.map((r) => {
            const st = REMINDER_STATUS[r.status] ?? REMINDER_STATUS.pending;
            const isPending = r.status === "pending";
            return (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.customerName ?? "—"}</p>
                  <p className="text-[11px] text-slate-400">{r.customerEmail ?? r.customerPhone ?? "Sin contacto"}</p>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                  {new Intl.NumberFormat("es-ES", { style: "currency", currency: r.currency }).format(r.amount / 100)}
                </td>
                <td className="px-4 py-3 text-slate-500 text-[12px]">
                  {new Date(r.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.remindersSent} / 3
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", st.badge)}>
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isPending && r.customerEmail && (
                      <button
                        onClick={() => void act(r.id, "send")}
                        disabled={acting === r.id + "send"}
                        title="Enviar recordatorio ahora"
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Enviar
                      </button>
                    )}
                    <button
                      onClick={() => openWhatsApp(r)}
                      title="Enviar por WhatsApp"
                      className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </button>
                    {isPending && (
                      <button
                        onClick={() => void act(r.id, "cancel")}
                        disabled={acting === r.id + "cancel"}
                        title="Cancelar recordatorios"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      >
                        <BellOff className="h-3 w-3" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Setup Banner ─────────────────────────────────────────────────────────────

function SetupBanner() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSetup() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/connect/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Error al iniciar la configuración");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Link2 className="h-7 w-7 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Configura tu cuenta de cobros</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Para empezar a cobrar necesitas vincular tu cuenta bancaria. Es un proceso rápido de 5 minutos.
      </p>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={handleSetup}
        disabled={loading}
        className="mt-6 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
      >
        {loading
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Configurando…</>
          : "Configurar cuenta de cobros →"
        }
      </button>
    </div>
  );
}

// ─── Mobile link card ─────────────────────────────────────────────────────────

function MobileLinkCard({
  link,
  onCancel,
  canceling,
}: {
  link:      PaymentLink;
  onCancel:  (token: string) => void;
  canceling: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const s = STATUS[link.status] ?? STATUS.open;

  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-white p-4">
      {/* Fila superior: estado + importe */}
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
          s.badge,
        )}>
          {s.icon}{s.label}
        </span>
        <span className="text-[18px] font-bold tabular-nums text-slate-900 leading-none">
          {formatCurrency(link.amount / 100, link.currency)}
        </span>
      </div>

      {/* Descripción */}
      <p className="mt-2 text-[14px] font-semibold text-slate-800 leading-tight truncate">
        {link.description ?? "Sin descripción"}
      </p>
      {link.customerName && (
        <p className="mt-0.5 text-[12px] text-slate-400 truncate">{link.customerName}</p>
      )}

      {/* URL + fecha */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-400 truncate">
          /pay/{link.token.slice(0, 10)}…
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">{formatDate(link.createdAt)}</span>
      </div>

      {/* Acciones */}
      <div className="mt-3 flex gap-2 border-t border-slate-50 pt-3">
        <button
          onClick={handleCopy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-[12px] font-semibold text-slate-700 active:bg-slate-50"
        >
          {copied
            ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-500" />Copiado</>
            : <><Copy className="h-3.5 w-3.5" />Copiar</>
          }
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-[12px] font-semibold text-slate-700 active:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />Abrir
        </a>
        {link.status === "open" && (
          <button
            onClick={() => onCancel(link.token)}
            disabled={canceling === link.token}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 py-2 text-[12px] font-semibold text-red-500 active:bg-red-50 disabled:opacity-50"
          >
            {canceling === link.token
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-red-300 border-t-red-500" />
              : <XCircle className="h-3.5 w-3.5" />
            }
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentLinksPage() {
  const [links,      setLinks]      = useState<PaymentLink[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [canceling,  setCanceling]  = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchLinks = useCallback(async () => {
    const status = filter !== "all" ? `?status=${filter}` : "";
    const res    = await fetch(`/api/payment-links${status}`);
    if (res.status === 422) {
      setNeedsSetup(true);
      setLoading(false);
      return;
    }
    if (!res.ok) { setLoading(false); return; }
    const json = await res.json() as { data: PaymentLink[] };
    setNeedsSetup(false);
    setLinks(json.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void fetchLinks(); }, [fetchLinks]);

  const cancelLink = async (token: string) => {
    setCanceling(token);
    await fetch(`/api/payment-links/${token}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "cancel" }),
    });
    await fetchLinks();
    setCanceling(null);
  };

  const FILTERS = [
    { value: "all",         label: "Todos"         },
    { value: "open",        label: "Activos"       },
    { value: "paid",        label: "Pagados"       },
    { value: "expired",     label: "Expirados"     },
    { value: "canceled",    label: "Cancelados"    },
    { value: "reminders",   label: "Recordatorios" },
  ];

  return (
    <>
      {/* Modal (desktop) / bottom sheet (mobile) */}
      {modal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => setModal(false)}
          />
          {/* Panel — centrado en desktop, bottom sheet en mobile */}
          <div className="fixed inset-x-0 bottom-0 z-[60] md:inset-0 md:flex md:items-center md:justify-center md:p-4">
            <div
              className="w-full rounded-t-3xl bg-white px-4 pt-3 pb-6 shadow-2xl md:max-w-md md:rounded-3xl md:p-6"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle (mobile only) */}
              <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-200 md:hidden" />

              <CreateModal
                onCreated={fetchLinks}
                onClose={() => setModal(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className="flex min-h-screen w-full flex-col bg-slate-50 md:hidden">
        {/* Header */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-100 bg-white px-4"
          style={{
            paddingTop:    "calc(env(safe-area-inset-top, 0px) + 14px)",
            paddingBottom: "14px",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                <polygon points="10,1 17.5,5.5 17.5,14.5 10,19 2.5,14.5 2.5,5.5" fill="white" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-slate-900">Cobros</span>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white active:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo link
          </button>
        </header>

        <div className="w-full space-y-2.5 px-4 pb-4 pt-3">
          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  filter === f.value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-500"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {filter === "reminders" ? (
            <RemindersTab />
          ) : loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[120px] w-full animate-pulse rounded-2xl bg-white border border-slate-100" />
              ))}
            </div>
          ) : needsSetup ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Link2 className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-[15px] font-semibold text-slate-900">Configura tu cuenta</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Vincula tu IBAN para empezar a cobrar
              </p>
              <a
                href="/app/connect/onboarding"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                Añadir cuenta bancaria →
              </a>
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Link2 className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">
                {filter === "all" ? "Sin enlaces de pago" : `Sin links "${FILTERS.find(f => f.value === filter)?.label}"`}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">Crea tu primer link para cobrar</p>
              <button
                onClick={() => setModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />Crear link
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {links.map((link) => (
                <MobileLinkCard
                  key={link.id}
                  link={link}
                  onCancel={cancelLink}
                  canceling={canceling}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className="hidden md:block min-h-full space-y-6 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              Payment Links
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
              <Link2 className="h-3.5 w-3.5" />
              Links de pago white-label · sin necesidad de integración
            </p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setModal(true)}>
            <Plus className="h-3.5 w-3.5" />Nuevo link
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                filter === f.value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {filter === "reminders" ? (
            <RemindersTab />
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
            </div>
          ) : needsSetup ? (
            <SetupBanner />
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Link2 className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-slate-700">
                {filter === "all" ? "Sin payment links" : `Sin links con estado "${filter}"`}
              </p>
              <button onClick={() => setModal(true)} className="mt-4 flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800">
                <Plus className="h-3.5 w-3.5" />Crear link
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Estado", "Descripción", "Importe", "URL", "Expiración", "Creado", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {links.map((link) => (
                    <tr key={link.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5"><StatusBadge status={link.status} /></td>
                      <td className="max-w-[180px] px-5 py-3.5">
                        <p className="truncate text-sm font-medium text-slate-800">{link.description ?? "Sin descripción"}</p>
                        {link.customerName && <p className="truncate text-xs text-slate-400">{link.customerName}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(link.amount / 100, link.currency)}</p>
                        <p className="text-[10px] text-slate-400">Fee: {formatCurrency(link.applicationFeeAmount / 100, link.currency)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="max-w-[120px] truncate font-mono text-[11px] text-slate-400">/pay/{link.token.slice(0, 8)}…</span>
                          <CopyButton text={link.url} />
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1 text-slate-300 hover:text-slate-600">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {link.expiresAt
                          ? <span className={cn(new Date(link.expiresAt) < new Date() && link.status === "open" ? "text-red-500" : "")}>{formatDate(link.expiresAt)}</span>
                          : <span className="text-slate-300">Sin límite</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-xs tabular-nums text-slate-400">{formatDate(link.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        {link.status === "open" && (
                          <button onClick={() => cancelLink(link.token)} disabled={canceling === link.token} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors">
                            {canceling === link.token ? <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" /> : <XCircle className="h-3.5 w-3.5" />}
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <div className="text-[12px] text-blue-700">
            <p className="font-semibold">¿Cómo funciona?</p>
            <p className="mt-0.5 text-blue-600">
              Cada enlace genera un pago seguro. Al completarse, el estado se actualiza a <strong>Pagado</strong> automáticamente.
              La comisión de PayForce (4% + €0,40) se descuenta en cada cobro.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
