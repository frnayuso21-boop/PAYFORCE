"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronRight, User, Building2, Receipt, Truck, FileText, AlertCircle, Check } from "lucide-react";

/* ─── Datos de referencia ───────────────────────────────────────────────────── */

const LANGUAGES = [
  { code: "es", label: "Español" }, { code: "en", label: "English" },
  { code: "fr", label: "Français" }, { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" }, { code: "it", label: "Italiano" },
];

const CURRENCIES = [
  { code: "eur", label: "EUR — Euro" }, { code: "usd", label: "USD — Dólar" },
  { code: "gbp", label: "GBP — Libra" }, { code: "mxn", label: "MXN — Peso mexicano" },
  { code: "ars", label: "ARS — Peso argentino" }, { code: "cop", label: "COP — Peso colombiano" },
  { code: "clp", label: "CLP — Peso chileno" },
];

const TIMEZONES = [
  { tz: "Europe/Madrid",    label: "Madrid (UTC+1/+2)"    },
  { tz: "Europe/London",    label: "Londres (UTC+0/+1)"   },
  { tz: "Europe/Paris",     label: "París (UTC+1/+2)"     },
  { tz: "America/New_York", label: "Nueva York (UTC-5/-4)" },
  { tz: "America/Mexico_City", label: "México (UTC-6/-5)" },
  { tz: "America/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { tz: "America/Bogota",   label: "Bogotá (UTC-5)"       },
  { tz: "America/Santiago", label: "Santiago (UTC-4/-3)"  },
];

const COUNTRIES = [
  { code: "ES", label: "España", prefix: "+34" },
  { code: "MX", label: "México", prefix: "+52" },
  { code: "AR", label: "Argentina", prefix: "+54" },
  { code: "CO", label: "Colombia", prefix: "+57" },
  { code: "CL", label: "Chile", prefix: "+56" },
  { code: "US", label: "Estados Unidos", prefix: "+1" },
  { code: "GB", label: "Reino Unido", prefix: "+44" },
  { code: "FR", label: "Francia", prefix: "+33" },
  { code: "DE", label: "Alemania", prefix: "+49" },
  { code: "PT", label: "Portugal", prefix: "+351" },
  { code: "IT", label: "Italia", prefix: "+39" },
];

const TAX_STATUS = [
  { value: "none",    label: "No exento" },
  { value: "exempt",  label: "Exento" },
  { value: "reverse", label: "Anular cargo (reverse charge)" },
];

const TAX_ID_TYPES: Record<string, { value: string; label: string }[]> = {
  ES: [
    { value: "dni",  label: "DNI" },
    { value: "nie",  label: "NIE" },
    { value: "cif",  label: "CIF / NIF (empresa)" },
    { value: "vat",  label: "VAT (IVA intracomunitario)" },
  ],
  default: [
    { value: "vat",  label: "VAT" },
    { value: "ein",  label: "EIN (EEUU)" },
    { value: "other", label: "Otro" },
  ],
};

/* ─── Tipos ─────────────────────────────────────────────────────────────────── */

interface FormData {
  // Account
  name: string; email: string; language: string; description: string;
  companyName: string; contactName: string;
  // Billing
  billingEmail: string; sameBillingEmail: boolean;
  billingCountry: string; phone: string; phonePrefix: string;
  currency: string; timezone: string;
  // Tax
  taxStatus: string; taxId: string; taxIdType: string; taxIdCountry: string;
  // Shipping
  sameShipping: boolean;
  shippingName: string; shippingAddress: string; shippingCity: string;
  shippingPostalCode: string; shippingState: string; shippingCountry: string;
  // Invoice
  invoiceTemplate: string;
}

interface Errors { [key: string]: string }

const EMPTY: FormData = {
  name: "", email: "", language: "es", description: "",
  companyName: "", contactName: "",
  billingEmail: "", sameBillingEmail: true,
  billingCountry: "ES", phone: "", phonePrefix: "+34",
  currency: "eur", timezone: "Europe/Madrid",
  taxStatus: "none", taxId: "", taxIdType: "", taxIdCountry: "ES",
  sameShipping: false,
  shippingName: "", shippingAddress: "", shippingCity: "",
  shippingPostalCode: "", shippingState: "", shippingCountry: "ES",
  invoiceTemplate: "default",
};

/* ─── Helpers de UI ─────────────────────────────────────────────────────────── */

function Field({ label, hint, error, children, required }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-3.5 py-2.5 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-offset-0 ${
    err
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-slate-400 focus:ring-slate-100"
  }`;

const selectCls = (err?: string) =>
  `w-full rounded-xl border px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition appearance-none bg-white focus:ring-2 focus:ring-offset-0 ${
    err
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-slate-400 focus:ring-slate-100"
  }`;

function Section({ icon, title, children, collapsible = false, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left ${collapsible ? "hover:bg-slate-100/60 transition-colors" : ""}`}
      >
        <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
          {icon}
        </div>
        <span className="flex-1 text-[13px] font-semibold text-slate-800">{title}</span>
        {collapsible && (
          open
            ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100 pt-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-4.5 w-4.5 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked ? "bg-slate-900 border-slate-900" : "bg-white border-slate-300 hover:border-slate-400"
        }`}
        style={{ minWidth: 18, minHeight: 18 }}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
      <span className="text-[13px] text-slate-600">{label}</span>
    </label>
  );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */

interface Props {
  open:    boolean;
  onClose: () => void;
  onSaved: (customer: Record<string, unknown>) => void;
}

export function CreateCustomerModal({ open, onClose, onSaved }: Props) {
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [errors,  setErrors]  = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Sincronizar billingEmail cuando sameBillingEmail está activo */
  useEffect(() => {
    if (form.sameBillingEmail) set("billingEmail", form.email);
  }, [form.email, form.sameBillingEmail]);

  /* Prefijo de teléfono según país de facturación */
  useEffect(() => {
    const c = COUNTRIES.find(c => c.code === form.billingCountry);
    if (c) set("phonePrefix", c.prefix);
  }, [form.billingCountry]);

  /* Tipo de ID fiscal según país */
  useEffect(() => {
    set("taxIdType", "");
  }, [form.taxIdCountry]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.name.trim())  e.name  = "El nombre es obligatorio";
    if (!form.email.trim()) e.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email no válido";
    if (form.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.billingEmail))
      e.billingEmail = "Email de facturación no válido";
    if (!form.currency) e.currency = "La divisa es obligatoria";
    if (!form.timezone) e.timezone = "La zona horaria es obligatoria";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/customers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ _global: data.error ?? "Error al guardar" }); return; }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved(data);
        setForm(EMPTY);
        onClose();
      }, 900);
    } catch {
      setErrors({ _global: "Error de conexión" });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setForm(EMPTY);
    setErrors({});
    onClose();
  }

  if (!open) return null;

  const taxTypes = TAX_ID_TYPES[form.taxIdCountry] ?? TAX_ID_TYPES.default;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "96dvh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900">Crear cliente</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Rellena los datos del nuevo cliente</p>
          </div>
          <button onClick={handleClose}
            className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Cuerpo con scroll ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          style={{ scrollbarWidth: "thin" }}>

          {/* Error global */}
          {errors._global && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2 text-[13px] text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />{errors._global}
            </div>
          )}

          {/* ── 1. DATOS DE LA CUENTA ── */}
          <Section icon={<User className="h-3.5 w-3.5 text-slate-500" />} title="Datos de la cuenta">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required error={errors.name}>
                <input className={inputCls(errors.name)} placeholder="María García"
                  value={form.name} onChange={e => set("name", e.target.value)} />
              </Field>
              <Field label="Correo electrónico" required error={errors.email}>
                <input type="email" className={inputCls(errors.email)} placeholder="maria@empresa.com"
                  value={form.email} onChange={e => set("email", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Idioma">
                <div className="relative">
                  <select className={selectCls()} value={form.language} onChange={e => set("language", e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
              <Field label="Descripción" hint="Solo visible internamente">
                <input className={inputCls()} placeholder="Cliente premium, empresa de software…"
                  value={form.description} onChange={e => set("description", e.target.value)} />
              </Field>
            </div>

            {/* Bloque secundario */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Estos datos no aparecen en las facturas y solo se pueden ver en la página del cliente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre de empresa">
                  <input className={inputCls()} placeholder="Acme Corp S.L."
                    value={form.companyName} onChange={e => set("companyName", e.target.value)} />
                </Field>
                <Field label="Contacto principal">
                  <input className={inputCls()} placeholder="Pedro Sánchez"
                    value={form.contactName} onChange={e => set("contactName", e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── 2. DATOS DE FACTURACIÓN ── */}
          <Section icon={<Receipt className="h-3.5 w-3.5 text-slate-500" />} title="Datos de facturación" collapsible defaultOpen>
            <Field label="Correo de facturación" error={errors.billingEmail}>
              <input type="email" className={inputCls(errors.billingEmail)}
                placeholder="facturacion@empresa.com"
                disabled={form.sameBillingEmail}
                value={form.billingEmail}
                onChange={e => set("billingEmail", e.target.value)}
                style={{ opacity: form.sameBillingEmail ? 0.6 : 1 }}
              />
            </Field>
            <CheckBox
              checked={form.sameBillingEmail}
              onChange={v => set("sameBillingEmail", v)}
              label="Usar el mismo correo electrónico de la cuenta"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Field label="País">
                <div className="relative">
                  <select className={selectCls()} value={form.billingCountry} onChange={e => set("billingCountry", e.target.value)}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
              <Field label="Teléfono">
                <div className="flex gap-2">
                  <div className="relative w-[90px] shrink-0">
                    <select className={selectCls()} value={form.phonePrefix} onChange={e => set("phonePrefix", e.target.value)}
                      style={{ paddingRight: 28 }}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.prefix}>{c.prefix}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input className={inputCls()} placeholder="612 345 678"
                    value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Divisa" required error={errors.currency}>
                <div className="relative">
                  <select className={selectCls(errors.currency)} value={form.currency} onChange={e => set("currency", e.target.value)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
              <Field label="Zona horaria" required error={errors.timezone}>
                <div className="relative">
                  <select className={selectCls(errors.timezone)} value={form.timezone} onChange={e => set("timezone", e.target.value)}>
                    {TIMEZONES.map(t => <option key={t.tz} value={t.tz}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
            </div>
          </Section>

          {/* ── 3. INFORMACIÓN FISCAL ── */}
          <Section icon={<Building2 className="h-3.5 w-3.5 text-slate-500" />} title="Información fiscal" collapsible defaultOpen={false}>
            <Field label="Estado fiscal">
              <div className="relative">
                <select className={selectCls()} value={form.taxStatus} onChange={e => set("taxStatus", e.target.value)}>
                  {TAX_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="País del ID fiscal">
                <div className="relative">
                  <select className={selectCls()} value={form.taxIdCountry} onChange={e => set("taxIdCountry", e.target.value)}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
              <Field label="Tipo de ID fiscal">
                <div className="relative">
                  <select className={selectCls()} value={form.taxIdType} onChange={e => set("taxIdType", e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {taxTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
              <Field label="Número de ID fiscal" hint="Ej: B-12345678, 12345678A">
                <input className={inputCls()} placeholder="B-12345678"
                  value={form.taxId} onChange={e => set("taxId", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* ── 4. INFORMACIÓN DE ENVÍO ── */}
          <Section icon={<Truck className="h-3.5 w-3.5 text-slate-500" />} title="Información de envío" collapsible defaultOpen={false}>
            <CheckBox
              checked={form.sameShipping}
              onChange={v => {
                set("sameShipping", v);
                if (v) {
                  set("shippingCountry", form.billingCountry);
                }
              }}
              label="Usar la misma dirección que la de facturación"
            />
            <Field label="Nombre del destinatario">
              <input className={inputCls()} placeholder="María García"
                value={form.shippingName} onChange={e => set("shippingName", e.target.value)} />
            </Field>
            <Field label="Dirección">
              <input className={inputCls()} placeholder="Calle Mayor 1, 2ºA"
                value={form.shippingAddress} onChange={e => set("shippingAddress", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Ciudad">
                <input className={inputCls()} placeholder="Madrid"
                  value={form.shippingCity} onChange={e => set("shippingCity", e.target.value)} />
              </Field>
              <Field label="C. Postal">
                <input className={inputCls()} placeholder="28001"
                  value={form.shippingPostalCode} onChange={e => set("shippingPostalCode", e.target.value)} />
              </Field>
              <Field label="Provincia">
                <input className={inputCls()} placeholder="Madrid"
                  value={form.shippingState} onChange={e => set("shippingState", e.target.value)} />
              </Field>
              <Field label="País">
                <div className="relative">
                  <select className={selectCls()} value={form.shippingCountry} onChange={e => set("shippingCountry", e.target.value)}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </Field>
            </div>
          </Section>

          {/* ── 5. CONFIGURACIÓN DE FACTURAS ── */}
          <Section icon={<FileText className="h-3.5 w-3.5 text-slate-500" />} title="Configuración de facturas" collapsible defaultOpen={false}>
            <Field label="Plantilla de factura" hint="Selecciona qué plantilla usar por defecto para este cliente">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "default", label: "Plantilla predeterminada", desc: "La plantilla general de tu cuenta" },
                  { value: "custom",  label: "Crear nueva plantilla",    desc: "Personaliza el diseño para este cliente" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("invoiceTemplate", opt.value)}
                    className={`flex flex-col items-start text-left rounded-xl border-2 px-4 py-3.5 transition-all ${
                      form.invoiceTemplate === opt.value
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        form.invoiceTemplate === opt.value ? "border-slate-900" : "border-slate-300"
                      }`}>
                        {form.invoiceTemplate === opt.value && (
                          <div className="h-2 w-2 rounded-full bg-slate-900" />
                        )}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-800">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 ml-6">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </Field>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white shrink-0">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Los campos con <span className="text-red-500">*</span> son obligatorios
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={handleClose} disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" onClick={handleSubmit} disabled={loading || saved}
              className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60 flex items-center gap-2"
              style={{ background: saved ? "#16a34a" : "#0f172a" }}
            >
              {saved ? (
                <><Check className="h-4 w-4" /> Guardado</>
              ) : loading ? (
                <><div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Guardando…</>
              ) : "Guardar cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
