"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText, Download, Settings, Eye, Search, RefreshCw,
  CheckCircle2, XCircle, Clock, Building2, Mail, Phone,
  Globe, CreditCard, Hash, MapPin, Palette, StickyNote,
  Save, Loader2, X, Landmark, Tag, Plus, Trash2,
  CalendarDays, User, AlertCircle, ChevronDown,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface InvoiceSettings {
  companyName:       string;
  taxId:             string;
  address:           string;
  city:              string;
  postalCode:        string;
  country:           string;
  phone:             string;
  website:           string;
  email:             string;
  logoUrl:           string | null;
  accentColor:       string;
  invoicePrefix:     string;
  nextInvoiceNumber: number;
  invoiceNotes:      string;
  paymentTerms:      string;
  bankAccount:       string;
}

interface InvoicePayment {
  id:                    string;
  stripePaymentIntentId: string;
  amount:                number;
  currency:              string;
  status:                string;
  description:           string | null;
  customerName:          string | null;
  customerEmail:         string | null;
  createdAt:             string;
  stripeCreatedAt:       string | null;
  applicationFeeAmount:  number;
}

interface ManualInvoiceLine {
  description: string; quantity: string; unitPrice: string; taxRate: string; productId?: string;
}
interface ManualInvoice {
  id: string; invoiceNumber: string; status: string;
  clientName: string; clientEmail?: string | null;
  issueDate: string; dueDate?: string | null;
  total: number; currency: string;
  lines: { description: string; quantity: number; unitPrice: number; taxRate: number; total: number }[];
}
interface Product { id: string; name: string; price: number; currency: string; unit: string; taxRate: number; }

const MANUAL_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: "Borrador", cls: "bg-slate-100 text-slate-500" },
  SENT:      { label: "Enviada",  cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  PAID:      { label: "Pagada",   cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  OVERDUE:   { label: "Vencida",  cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  CANCELLED: { label: "Anulada",  cls: "bg-slate-100 text-slate-400" },
};

// ─── Modal de nueva factura manual ───────────────────────────────────────────
function NewInvoiceModal({ onClose, onCreated, products }: {
  onClose:   () => void;
  onCreated: (inv: ManualInvoice) => void;
  products:  Product[];
}) {
  const [clientName,    setClientName]    = useState("");
  const [clientEmail,   setClientEmail]   = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTaxId,   setClientTaxId]   = useState("");
  const [dueDate,       setDueDate]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [paymentTerms,  setPaymentTerms]  = useState("Pago inmediato");
  const [currency,      setCurrency]      = useState("eur");
  const [lines, setLines] = useState<ManualInvoiceLine[]>([
    { description: "", quantity: "1", unitPrice: "", taxRate: "21" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function addLine() {
    setLines(prev => [...prev, { description: "", quantity: "1", unitPrice: "", taxRate: "21" }]);
  }
  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }
  function setLine(i: number, k: keyof ManualInvoiceLine, v: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }
  function selectProduct(i: number, productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    setLines(prev => prev.map((l, idx) => idx === i
      ? { ...l, productId, description: p.name, unitPrice: String(p.price / 100), taxRate: String(p.taxRate), quantity: "1" }
      : l));
    setCurrency(p.currency);
  }

  const lineTotal = (l: ManualInvoiceLine) => {
    const qty = parseFloat(l.quantity) || 0;
    const up  = parseFloat(l.unitPrice.replace(",",".")) || 0;
    return qty * up;
  };
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const total    = lines.reduce((s, l) => {
    const base = lineTotal(l);
    const tax  = parseFloat(l.taxRate) || 0;
    return s + base + base * tax / 100;
  }, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return setError("El nombre del cliente es obligatorio");
    if (!lines.some(l => l.description && l.unitPrice)) return setError("Añade al menos una línea con descripción y precio");

    setSaving(true); setError("");
    const body = {
      clientName, clientEmail, clientAddress, clientTaxId,
      dueDate: dueDate || undefined,
      notes, paymentTerms, currency,
      lines: lines.filter(l => l.description && l.unitPrice).map((l, i) => ({
        description: l.description,
        quantity:    parseFloat(l.quantity) || 1,
        unitPrice:   Math.round((parseFloat(l.unitPrice.replace(",",".")) || 0) * 100),
        taxRate:     parseFloat(l.taxRate)  || 0,
        productId:   l.productId,
        position:    i,
      })),
    };
    const res  = await fetch("/api/invoices/manual", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error ?? "Error al crear la factura");
    onCreated(json.invoice);
  }

  const inp = "w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <FileText className="h-4 w-4 text-white"/>
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900">Nueva factura</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}
            </div>
          )}

          {/* Cliente */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3.5 w-3.5 text-indigo-500"/>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Datos del cliente</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nombre <span className="text-red-400">*</span></label>
                <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Empresa o persona" className={inp}/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Email</label>
                <input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="cliente@email.com" className={inp}/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">NIF / CIF</label>
                <input value={clientTaxId} onChange={e=>setClientTaxId(e.target.value)} placeholder="B-12345678" className={inp}/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Dirección</label>
                <input value={clientAddress} onChange={e=>setClientAddress(e.target.value)} placeholder="Calle, ciudad…" className={inp}/>
              </div>
            </div>
          </div>

          {/* Condiciones */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-500"/>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Condiciones</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Divisa</label>
                <div className="relative">
                  <select value={currency} onChange={e=>setCurrency(e.target.value)} className={inp + " pr-7 appearance-none"}>
                    {["eur","usd","gbp","mxn"].map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Vencimiento</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className={inp}/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Cond. de pago</label>
                <input value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} className={inp}/>
              </div>
            </div>
          </div>

          {/* Líneas */}
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-indigo-500"/>
                <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Líneas de factura</h3>
              </div>
              <button type="button" onClick={addLine}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition">
                <Plus className="h-3 w-3"/>Añadir línea
              </button>
            </div>

            {/* Cabecera */}
            <div className="grid text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-1.5"
              style={{ gridTemplateColumns: "2fr 0.6fr 1fr 0.7fr 1fr 28px" }}>
              <span>Concepto</span><span className="text-right">Cant.</span>
              <span className="text-right">P.Unit.</span><span className="text-right">IVA%</span>
              <span className="text-right">Total</span><span/>
            </div>

            <div className="space-y-2">
              {lines.map((l, i) => {
                const tot = lineTotal(l);
                return (
                  <div key={i} className="grid gap-1.5 items-start" style={{ gridTemplateColumns: "2fr 0.6fr 1fr 0.7fr 1fr 28px" }}>
                    <div className="flex flex-col gap-1">
                      {products.length > 0 && (
                        <div className="relative">
                          <select
                            value={l.productId ?? ""}
                            onChange={e => selectProduct(i, e.target.value)}
                            className="w-full appearance-none rounded-md border border-slate-200 pl-2 pr-6 py-1.5 text-[10px] text-slate-500 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">— del catálogo —</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price/100, p.currency)})</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400"/>
                        </div>
                      )}
                      <input value={l.description} onChange={e=>setLine(i,"description",e.target.value)}
                        placeholder="Descripción del concepto…"
                        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] focus:border-indigo-400 focus:outline-none w-full"/>
                    </div>
                    <input value={l.quantity} onChange={e=>setLine(i,"quantity",e.target.value)} type="number" min="0" step="0.01"
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-[12px] text-right focus:border-indigo-400 focus:outline-none"/>
                    <input value={l.unitPrice} onChange={e=>setLine(i,"unitPrice",e.target.value)} type="number" min="0" step="0.01"
                      placeholder="0.00"
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-[12px] text-right focus:border-indigo-400 focus:outline-none"/>
                    <input value={l.taxRate} onChange={e=>setLine(i,"taxRate",e.target.value)} type="number" min="0" step="0.5"
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-[12px] text-right focus:border-indigo-400 focus:outline-none"/>
                    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-[12px] font-semibold text-slate-700 text-right">
                      {tot > 0 ? `€${tot.toFixed(2)}` : "—"}
                    </div>
                    <button type="button" onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      className="flex items-center justify-center rounded-md p-1.5 text-red-300 hover:bg-red-50 disabled:opacity-30 transition">
                      <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Totales */}
            <div className="mt-4 flex justify-end">
              <div className="w-48 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  <span>Total</span><span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="h-3.5 w-3.5 text-indigo-500"/>
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Notas</h3>
            </div>
            <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Instrucciones de pago, agradecimiento, condiciones especiales…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] resize-none focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"/>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            onClick={e => { e.preventDefault(); const form = document.querySelector("form"); form?.requestSubmit(); }}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 transition"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Creando…</> : <><FileText className="h-4 w-4"/>Crear factura</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  companyName: "", taxId: "", address: "", city: "", postalCode: "",
  country: "ES", phone: "", website: "", email: "",
  logoUrl: null, accentColor: "#6366f1", invoicePrefix: "FAC",
  nextInvoiceNumber: 1, invoiceNotes: "", paymentTerms: "Pago inmediato",
  bankAccount: "",
};

// ─── Componente de estado de pago ────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    SUCCEEDED: { label: "Pagado",     cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    FAILED:    { label: "Fallido",    cls: "bg-red-50 text-red-700 ring-red-200",             icon: <XCircle      className="h-3 w-3" /> },
    PROCESSING:{ label: "Procesando", cls: "bg-amber-50 text-amber-700 ring-amber-200",       icon: <Clock        className="h-3 w-3" /> },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-50 text-slate-500 ring-slate-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

// ─── Preview de factura (componente React que imita el PDF) ──────────────────
function InvoicePreview({ payment, settings }: { payment: InvoicePayment; settings: InvoiceSettings }) {
  const accent = settings.accentColor ?? "#6366f1";
  const prefix = settings.invoicePrefix ?? "FAC";
  const d      = new Date(payment.createdAt);
  const invNum = `${prefix}-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(settings.nextInvoiceNumber).padStart(4,"0")}`;
  const net    = payment.amount - payment.applicationFeeAmount;
  const fmt = (c: number) => formatCurrency(c / 100, payment.currency);
  const fmtD = (s: string) => new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 595, minHeight: 842, fontFamily: "system-ui" }}>
      {/* Header */}
      <div className="flex justify-between items-start px-12 pt-10 pb-6">
        <div>
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain mb-2" />
          ) : (
            <div className="inline-block px-3 py-1.5 rounded-lg text-white font-bold text-[13px] mb-2"
              style={{ background: accent }}>
              {settings.companyName || "Tu Empresa"}
            </div>
          )}
          <div className="text-[10px] text-slate-400 leading-relaxed">
            {settings.email && <p>{settings.email}</p>}
            {settings.phone && <p>Tel: {settings.phone}</p>}
            {settings.website && <p>{settings.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[26px] font-black text-slate-900 tracking-tight">FACTURA</p>
          <p className="text-[11px] text-slate-400 mt-1">Nº {invNum}</p>
          <p className="text-[11px] text-slate-400">Fecha: {fmtD(payment.createdAt)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Cond: {settings.paymentTerms || "Pago inmediato"}</p>
        </div>
      </div>

      <div className="mx-12 border-t border-slate-100" />

      {/* Meta */}
      <div className="px-12 py-5 grid grid-cols-3 gap-6">
        <div>
          <p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">Emitida por</p>
          <p className="font-bold text-[11px] text-slate-900">{settings.companyName || "Tu Empresa"}</p>
          {settings.taxId     && <p className="text-[10px] text-slate-500">{settings.taxId}</p>}
          {settings.address   && <p className="text-[10px] text-slate-500">{settings.address}</p>}
          {(settings.postalCode || settings.city) && <p className="text-[10px] text-slate-500">{[settings.postalCode, settings.city].filter(Boolean).join(" ")}</p>}
          <p className="text-[10px] text-slate-500">País: {settings.country}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">Facturado a</p>
          <p className="font-bold text-[11px] text-slate-900">{payment.customerName ?? "Cliente"}</p>
          {payment.customerEmail && <p className="text-[10px] text-slate-500">{payment.customerEmail}</p>}
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">Estado</p>
          <StatusPill status={payment.status} />
          <p className="text-[9px] text-slate-400 mt-2 truncate">{payment.stripePaymentIntentId.slice(0,22)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="px-12">
        <div className="rounded-lg bg-slate-50 px-4 py-2.5 grid grid-cols-4 mb-1">
          {["Concepto","Cant.","Precio unit.","Total"].map((h, i) => (
            <p key={h} className={cn("text-[8px] font-bold tracking-widest text-slate-400 uppercase", i > 0 ? "text-right" : "")}>{h}</p>
          ))}
        </div>
        <div className="px-4 py-3 grid grid-cols-4 border-b border-slate-100">
          <p className="text-[10px] text-slate-700">{payment.description ?? "Pago procesado"}</p>
          <p className="text-[10px] text-slate-500 text-right">1</p>
          <p className="text-[10px] text-slate-700 text-right">{fmt(payment.amount)}</p>
          <p className="text-[10px] font-bold text-slate-900 text-right">{fmt(payment.amount)}</p>
        </div>
        <div className="px-4 py-2.5 grid grid-cols-4">
          <p className="text-[9px] text-slate-400">Comisión PayForce (4% + 0,40 €)</p>
          <p className="text-[9px] text-slate-400 text-right">1</p>
          <p className="text-[9px] text-slate-400 text-right">−{fmt(payment.applicationFeeAmount)}</p>
          <p className="text-[9px] text-slate-400 text-right">−{fmt(payment.applicationFeeAmount)}</p>
        </div>

        {/* Totales */}
        <div className="flex justify-end mt-2">
          <div className="w-52 flex flex-col gap-2">
            {[["Subtotal", fmt(payment.amount)], ["Comisión PayForce", `−${fmt(payment.applicationFeeAmount)}`], ["Neto recibido", fmt(net)]].map(([l,v]) => (
              <div key={l} className="flex justify-between text-[10px]">
                <span className="text-slate-500">{l}</span>
                <span className="text-slate-700">{v}</span>
              </div>
            ))}
            <div className="flex justify-between rounded-lg px-3 py-2 mt-1 text-white font-bold text-[11px]"
              style={{ background: accent }}>
              <span>Total facturado</span>
              <span>{fmt(payment.amount)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {(settings.invoiceNotes || settings.bankAccount) && (
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            {settings.invoiceNotes && (
              <><p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-1">Notas</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{settings.invoiceNotes}</p></>
            )}
            {settings.bankAccount && (
              <><p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-1 mt-3">Datos bancarios</p>
              <p className="text-[10px] text-slate-600">{settings.bankAccount}</p></>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mx-12 mt-6 pt-4 border-t border-slate-100 flex justify-between items-end pb-8">
        <div className="text-[8px] text-slate-400 leading-relaxed">
          <p>Documento generado automáticamente por PayForce Systems S.L.</p>
          <p>payforce.io · soporte@payforce.io</p>
          <div className="flex gap-2 mt-1">
            {["🔒 PCI DSS Level 1","✓ 3D Secure","SSL 256-bit"].map(t => (
              <span key={t} className="bg-slate-50 rounded px-1.5 py-0.5 text-slate-400">{t}</span>
            ))}
          </div>
        </div>
        <div className="text-right text-[8px] text-slate-400">
          <p>Pago: {fmtD(payment.createdAt)}</p>
          <p className="mt-0.5">ID: {payment.id.slice(0,16)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sección de ajustes ──────────────────────────────────────────────────────
function SettingsPanel({ settings, onChange, onSave, saving }: {
  settings: InvoiceSettings;
  onChange: (k: keyof InvoiceSettings, v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const field = (
    label: string, icon: React.ReactNode,
    key: keyof InvoiceSettings, placeholder?: string, type = "text"
  ) => (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
        {icon}{label}
      </label>
      <input
        type={type}
        value={(settings[key] as string) ?? ""}
        onChange={e => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        {field("Nombre de empresa",  <Building2 className="h-3 w-3 text-slate-400"/>, "companyName",   "Arista Móvil S.L.")}
        {field("NIF / CIF / VAT",    <Hash       className="h-3 w-3 text-slate-400"/>, "taxId",         "B-12345678")}
        {field("Email de facturación",<Mail      className="h-3 w-3 text-slate-400"/>, "email",         "facturacion@empresa.com", "email")}
        {field("Teléfono",           <Phone      className="h-3 w-3 text-slate-400"/>, "phone",         "+34 600 000 000")}
        {field("Dirección",          <MapPin     className="h-3 w-3 text-slate-400"/>, "address",       "Calle Mayor 1, Bajo")}
        {field("Ciudad",             <MapPin     className="h-3 w-3 text-slate-400"/>, "city",          "Madrid")}
        {field("Código postal",      <MapPin     className="h-3 w-3 text-slate-400"/>, "postalCode",    "28001")}
        {field("País",               <Globe      className="h-3 w-3 text-slate-400"/>, "country",       "ES")}
        {field("Sitio web",          <Globe      className="h-3 w-3 text-slate-400"/>, "website",       "https://empresa.com")}
        {field("URL del logo",       <FileText   className="h-3 w-3 text-slate-400"/>, "logoUrl",       "https://...")}
        {field("Prefijo de factura", <Tag        className="h-3 w-3 text-slate-400"/>, "invoicePrefix", "FAC")}
        {field("Condiciones de pago",<CreditCard className="h-3 w-3 text-slate-400"/>, "paymentTerms",  "Pago inmediato")}
      </div>

      {/* Color de acento */}
      <div>
        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
          <Palette className="h-3 w-3 text-slate-400"/> Color de marca
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.accentColor ?? "#6366f1"}
            onChange={e => onChange("accentColor", e.target.value)}
            className="h-9 w-14 rounded-lg border border-slate-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={settings.accentColor ?? "#6366f1"}
            onChange={e => onChange("accentColor", e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* IBAN */}
      <div>
        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
          <Landmark className="h-3 w-3 text-slate-400"/> IBAN / Datos bancarios
        </label>
        <input
          type="text"
          value={settings.bankAccount ?? ""}
          onChange={e => onChange("bankAccount", e.target.value)}
          placeholder="ES91 2100 0418 4502 0005 1332"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Notas */}
      <div>
        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
          <StickyNote className="h-3 w-3 text-slate-400"/> Notas / Pie de factura
        </label>
        <textarea
          rows={3}
          value={settings.invoiceNotes ?? ""}
          onChange={e => onChange("invoiceNotes", e.target.value)}
          placeholder="Gracias por confiar en nosotros. Para cualquier consulta..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] resize-none focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Guardando…</> : <><Save className="h-4 w-4"/>Guardar configuración</>}
      </button>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [tab,           setTab]           = useState<"list" | "manual" | "settings">("list");
  const [payments,      setPayments]      = useState<InvoicePayment[]>([]);
  const [manualInvs,    setManualInvs]    = useState<ManualInvoice[]>([]);
  const [settings,      setSettings]      = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [catalogProds,  setCatalogProds]  = useState<Product[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [search,        setSearch]        = useState("");
  const [preview,       setPreview]       = useState<InvoicePayment | null>(null);
  const [saveOk,        setSaveOk]        = useState(false);
  const [showNewInvoice,setShowNewInvoice]= useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes, mRes, prRes] = await Promise.all([
      fetch("/api/dashboard/payments?limit=100"),
      fetch("/api/invoices/settings"),
      fetch("/api/invoices/manual"),
      fetch("/api/products"),
    ]);
    if (pRes.ok) {
      const j = await pRes.json();
      setPayments((j.payments ?? []).filter((p: InvoicePayment) => p.status === "SUCCEEDED"));
    } else {
      setPayments([]); // 404 u otro error — no reintentar, mostrar vacío
    }
    if (sRes.ok) {
      const j = await sRes.json();
      if (j.settings) setSettings({ ...DEFAULT_SETTINGS, ...j.settings });
    }
    if (mRes.ok) {
      const j = await mRes.json();
      setManualInvs(j.invoices ?? []);
    }
    if (prRes.ok) {
      const j = await prRes.json();
      setCatalogProds(j.products ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/invoices/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500); }
  }

  function changeField(k: keyof InvoiceSettings, v: string) {
    setSettings(prev => ({ ...prev, [k]: v }));
  }

  const filtered = payments.filter(p =>
    !search ||
    p.stripePaymentIntentId.includes(search) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.customerEmail ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const prefix = settings.invoicePrefix ?? "FAC";

  return (
    <div className="min-h-full space-y-6 p-6 lg:p-8">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Facturas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Genera, crea y personaliza todas tus facturas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowNewInvoice(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <Plus className="h-4 w-4"/>Nueva factura
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: "list",     icon: <FileText  className="h-3.5 w-3.5"/>, label: "De cobros" },
          { id: "manual",   icon: <Plus      className="h-3.5 w-3.5"/>, label: `Manuales${manualInvs.length ? ` (${manualInvs.length})` : ""}` },
          { id: "settings", icon: <Settings  className="h-3.5 w-3.5"/>, label: "Personalizar" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition",
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Lista de facturas ── */}
      {tab === "list" && (
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, descripción o referencia…"
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-[13px] text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Tabla */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-800">
                {filtered.length} factura{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
              </h2>
              <span className="text-[11px] text-slate-400">Solo pagos completados</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <FileText className="h-10 w-10 text-slate-200" />
                <p className="text-[13px]">No hay facturas aún. Completa un pago para generarlas.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    {["Número","Fecha","Cliente","Descripción","Importe","Estado","Acciones"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p, i) => {
                    const d   = new Date(p.createdAt);
                    const num = `${prefix}-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(i+1).padStart(4,"0")}`;
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] font-semibold text-indigo-600">{num}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-slate-500">{formatDate(p.stripeCreatedAt ?? p.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="text-[12px] font-medium text-slate-700">{p.customerName ?? "—"}</p>
                            {p.customerEmail && <p className="text-[10px] text-slate-400">{p.customerEmail}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[160px]">
                          <span className="truncate block text-[12px] text-slate-500">{p.description ?? "Pago procesado"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-semibold tabular-nums text-slate-900">{formatCurrency(p.amount/100, p.currency)}</span>
                        </td>
                        <td className="px-5 py-3.5"><StatusPill status={p.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreview(p)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition"
                            >
                              <Eye className="h-3 w-3"/>Vista previa
                            </button>
                            <a
                              href={`/api/invoices/${p.id}`}
                              download
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                            >
                              <Download className="h-3 w-3"/>PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Ajustes ── */}
      {tab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Panel izquierdo: formulario */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold text-slate-800">Personalización de factura</h2>
              {saveOk && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5"/> Guardado
                </span>
              )}
            </div>
            <SettingsPanel
              settings={settings}
              onChange={changeField}
              onSave={saveSettings}
              saving={saving}
            />
          </div>

          {/* Panel derecho: preview en vivo */}
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-slate-400"/>
                <h2 className="text-[13px] font-semibold text-slate-800">Vista previa en vivo</h2>
                <span className="ml-auto text-[10px] text-slate-400">Se actualiza al instante</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex justify-center p-3">
                <div style={{ transform: "scale(0.52)", transformOrigin: "top center", marginBottom: "-220px" }}>
                  {payments.length > 0 ? (
                    <InvoicePreview payment={payments[0]} settings={settings} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400" style={{ width: 595 }}>
                      <FileText className="h-12 w-12 text-slate-200"/>
                      <p className="text-[14px]">Sin pagos completados aún</p>
                      <p className="text-[12px]">La vista previa usará el primer cobro completado</p>
                    </div>
                  )}
                </div>
              </div>
              {payments.length > 0 && (
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  Vista previa basada en el pago más reciente
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Facturas manuales ── */}
      {tab === "manual" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-300"/></div>
          ) : manualInvs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <FileText className="h-7 w-7 text-slate-300"/>
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-slate-600">Sin facturas manuales</p>
                <p className="text-[12px] text-slate-400 mt-1">Crea tu primera factura personalizada con líneas de productos</p>
              </div>
              <button
                onClick={() => setShowNewInvoice(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                <Plus className="h-4 w-4"/>Crear primera factura
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-[13px] font-semibold text-slate-800">{manualInvs.length} factura{manualInvs.length !== 1 ? "s" : ""} manual{manualInvs.length !== 1 ? "es" : ""}</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    {["Número","Fecha","Cliente","Importe","Estado","Acciones"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {manualInvs.map(inv => {
                    const st = MANUAL_STATUS[inv.status] ?? { label: inv.status, cls: "bg-slate-100 text-slate-500" };
                    return (
                      <tr key={inv.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] font-semibold text-indigo-600">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500">{formatDate(inv.issueDate)}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] font-medium text-slate-700">{inv.clientName}</p>
                          {inv.clientEmail && <p className="text-[10px] text-slate-400">{inv.clientEmail}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-semibold tabular-nums text-slate-900">{formatCurrency(inv.total/100, inv.currency)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", st.cls)}>{st.label}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`/api/invoices/manual/${inv.id}?pdf=1`}
                              download
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                            >
                              <Download className="h-3 w-3"/>PDF
                            </a>
                            <button
                              onClick={async () => {
                                if (!confirm("¿Eliminar esta factura?")) return;
                                const res = await fetch(`/api/invoices/manual/${inv.id}`, { method: "DELETE" });
                                if (res.ok) setManualInvs(prev => prev.filter(x => x.id !== inv.id));
                              }}
                              className="rounded-lg border border-red-100 px-2 py-1.5 text-red-400 hover:bg-red-50 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal nueva factura manual ── */}
      {showNewInvoice && (
        <NewInvoiceModal
          onClose={() => setShowNewInvoice(false)}
          onCreated={inv => { setManualInvs(prev => [inv, ...prev]); setShowNewInvoice(false); setTab("manual"); }}
          products={catalogProds}
        />
      )}

      {/* ── Modal de vista previa completa ── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 py-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) setPreview(null); }}
        >
          <div className="relative">
            {/* Botones */}
            <div className="flex items-center gap-2 mb-3 justify-end">
              <a
                href={`/api/invoices/${preview.id}`}
                download
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                <Download className="h-3.5 w-3.5"/>Descargar PDF
              </a>
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
              >
                <X className="h-4 w-4"/>
              </button>
            </div>
            <InvoicePreview payment={preview} settings={settings} />
          </div>
        </div>
      )}

    </div>
  );
}
