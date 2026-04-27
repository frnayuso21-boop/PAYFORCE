"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, User, CreditCard, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, AlertCircle, Shield,
} from "lucide-react";
import { HexLogo } from "@/components/icons/HexLogo";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FormData {
  // Paso 1
  businessName:   string;
  businessType:   "individual" | "company";
  taxId:          string;
  sector:         string;
  // Paso 2
  firstName:      string;
  lastName:       string;
  dobDay:         string;
  dobMonth:       string;
  dobYear:        string;
  address:        string;
  city:           string;
  postalCode:     string;
  phone:          string;
  idNumber:       string;
  // Paso 3
  iban:           string;
  accountHolder:  string;
  // Paso 4
  acceptedTerms:  boolean;
}

const SECTORS = [
  "Comercio minorista", "Hostelería y restauración", "Servicios profesionales",
  "Salud y bienestar", "Educación y formación", "Tecnología", "Construcción",
  "Transporte y logística", "Arte y entretenimiento", "Otro",
];

const EMPTY: FormData = {
  businessName: "", businessType: "individual", taxId: "", sector: "",
  firstName: "", lastName: "", dobDay: "", dobMonth: "", dobYear: "",
  address: "", city: "", postalCode: "", phone: "", idNumber: "",
  iban: "", accountHolder: "", acceptedTerms: false,
};

// ── Stepper ───────────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Negocio",    icon: Building2  },
  { label: "Identidad",  icon: User       },
  { label: "Banco",      icon: CreditCard },
  { label: "Confirmar",  icon: CheckCircle2 },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        const Icon    = s.icon;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: done ? "#1d1d1f" : active ? "#0071e3" : "#e5e5ea",
                  color:      done || active ? "#fff" : "#86868b",
                }}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#0071e3" : done ? "#1d1d1f" : "#86868b" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-12 h-px mx-1 mb-4 transition-colors"
                style={{ background: i < current ? "#1d1d1f" : "#e5e5ea" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Campo de formulario ───────────────────────────────────────────────────────
function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-slate-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition placeholder-slate-400";
const selectCls = inputCls + " appearance-none";

// ── Página principal ──────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step,       setStep]       = useState(0);
  const [form,       setForm]       = useState<FormData>(EMPTY);
  const [userEmail,  setUserEmail]  = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  useEffect(() => {
    // Comprobar si ya está verificado
    fetch("/api/connect/account")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const real = d?.accounts?.find(
          (a: { stripeAccountId?: string; chargesEnabled?: boolean }) =>
            a.stripeAccountId && !a.stripeAccountId.startsWith("local_") && a.chargesEnabled,
        );
        if (real) router.replace("/app/dashboard");
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { const e = d?.user?.email ?? d?.email; if (e) setUserEmail(e); })
      .catch(() => {});
  }, [router]);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setError("");
  }

  // ── Validación por paso ────────────────────────────────────────────────────
  function validate(): string {
    if (step === 0) {
      if (!form.businessName.trim()) return "El nombre del negocio es obligatorio.";
      if (!form.taxId.trim())        return "El CIF/NIF es obligatorio.";
    }
    if (step === 1) {
      if (!form.firstName.trim())  return "El nombre es obligatorio.";
      if (!form.lastName.trim())   return "Los apellidos son obligatorios.";
      if (!form.dobDay || !form.dobMonth || !form.dobYear) return "La fecha de nacimiento es obligatoria.";
      if (!form.address.trim())    return "La dirección es obligatoria.";
      if (!form.city.trim())       return "La ciudad es obligatoria.";
      if (!form.postalCode.trim()) return "El código postal es obligatorio.";
      if (!form.phone.trim())      return "El teléfono es obligatorio.";
    }
    if (step === 2) {
      if (!form.iban.trim()) return "El IBAN es obligatorio.";
      const ibanClean = form.iban.replace(/\s/g, "");
      if (!/^ES\d{22}$/.test(ibanClean)) return "Introduce un IBAN español válido (ES + 22 dígitos).";
    }
    if (step === 3) {
      if (!form.acceptedTerms) return "Debes aceptar los términos del servicio para continuar.";
    }
    return "";
  }

  function handleNext() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dobDay:   parseInt(form.dobDay,   10),
          dobMonth: parseInt(form.dobMonth, 10),
          dobYear:  parseInt(form.dobYear,  10),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Error al crear la cuenta."); return; }
      setDone(true);
      setTimeout(() => router.push("/app/dashboard"), 3000);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-[22px] font-semibold text-[#1d1d1f]">¡Cuenta activada!</h2>
          <p className="text-[13px] text-[#6e6e73]">
            Tu cuenta de cobros está siendo verificada por PayForce.
            Recibirás un email en <strong>{userEmail}</strong> cuando esté lista.
          </p>
          <div className="flex items-center justify-center gap-2 text-[12px] text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirigiendo al dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-4 py-8">
      <div className="mx-auto max-w-lg">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <HexLogo size={32} className="text-slate-900 mb-2" />
          <h1 className="text-[18px] font-semibold text-[#1d1d1f]">Activa tu cuenta de cobros</h1>
          <p className="text-[12px] text-[#6e6e73] mt-0.5">Proceso seguro en PayForce · Solo tarda 5 minutos</p>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-700">{error}</p>
          </div>
        )}

        {/* Card del paso */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">

          {/* ── PASO 1: Negocio ─────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Datos del negocio</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Información sobre tu actividad comercial</p>
              </div>

              <Field label="Nombre del negocio" required>
                <input className={inputCls} placeholder="Mi Tienda S.L. o Juan García"
                  value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
              </Field>

              <Field label="Tipo de actividad" required>
                <select className={selectCls} value={form.businessType}
                  onChange={(e) => set("businessType", e.target.value as "individual" | "company")}>
                  <option value="individual">Autónomo / Profesional</option>
                  <option value="company">Empresa / Sociedad</option>
                </select>
              </Field>

              <Field label={form.businessType === "company" ? "CIF" : "NIF/NIE"} required
                hint="Se usa para verificar tu identidad fiscal. No se muestra a tus clientes.">
                <input className={inputCls} placeholder={form.businessType === "company" ? "B12345678" : "12345678Z"}
                  value={form.taxId} onChange={(e) => set("taxId", e.target.value.toUpperCase())} />
              </Field>

              <Field label="Sector de actividad">
                <select className={selectCls} value={form.sector}
                  onChange={(e) => set("sector", e.target.value)}>
                  <option value="">Selecciona un sector…</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}

          {/* ── PASO 2: Identidad ───────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Datos del representante</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Información personal del titular de la cuenta</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" required>
                  <input className={inputCls} placeholder="Juan"
                    value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                </Field>
                <Field label="Apellidos" required>
                  <input className={inputCls} placeholder="García López"
                    value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                </Field>
              </div>

              <Field label="Fecha de nacimiento" required>
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputCls} placeholder="DD" maxLength={2} inputMode="numeric"
                    value={form.dobDay} onChange={(e) => set("dobDay", e.target.value)} />
                  <input className={inputCls} placeholder="MM" maxLength={2} inputMode="numeric"
                    value={form.dobMonth} onChange={(e) => set("dobMonth", e.target.value)} />
                  <input className={inputCls} placeholder="AAAA" maxLength={4} inputMode="numeric"
                    value={form.dobYear} onChange={(e) => set("dobYear", e.target.value)} />
                </div>
              </Field>

              <Field label="Dirección" required>
                <input className={inputCls} placeholder="Calle Mayor 1, 2º A"
                  value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ciudad" required>
                  <input className={inputCls} placeholder="Madrid"
                    value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Código postal" required>
                  <input className={inputCls} placeholder="28001" maxLength={5} inputMode="numeric"
                    value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
                </Field>
              </div>

              <Field label="Teléfono" required>
                <input className={inputCls} placeholder="+34 600 000 000" type="tel"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>

              <Field label="DNI / NIE / Pasaporte"
                hint="Número de tu documento de identidad oficial.">
                <input className={inputCls} placeholder="12345678Z"
                  value={form.idNumber} onChange={(e) => set("idNumber", e.target.value.toUpperCase())} />
              </Field>
            </>
          )}

          {/* ── PASO 3: Cuenta bancaria ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Cuenta bancaria</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Donde recibirás tus cobros</p>
              </div>

              <Field label="IBAN" required
                hint="Introduce tu IBAN español completo (ES + 22 dígitos).">
                <input className={inputCls + " font-mono tracking-wider"} placeholder="ES91 2100 0418 4502 0005 1332"
                  value={form.iban}
                  onChange={(e) => {
                    // Auto-formatear con espacios cada 4
                    const raw = e.target.value.replace(/\s/g, "").toUpperCase();
                    const formatted = raw.match(/.{1,4}/g)?.join(" ") ?? raw;
                    set("iban", formatted);
                  }}
                />
              </Field>

              <Field label="Titular de la cuenta"
                hint="Nombre tal como aparece en tu cuenta bancaria.">
                <input className={inputCls} placeholder={`${form.firstName} ${form.lastName}`.trim() || "Nombre Apellidos"}
                  value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} />
              </Field>

              <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-700 leading-relaxed">
                  Tus datos bancarios se transmiten de forma segura y encriptada. PayForce nunca almacena tus credenciales bancarias completas.
                </p>
              </div>
            </>
          )}

          {/* ── PASO 4: Confirmación ────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Confirmar datos</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Revisa tu información antes de activar la cuenta</p>
              </div>

              {/* Resumen */}
              <div className="space-y-3">
                {/* Negocio */}
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Negocio</p>
                  <SummaryRow label="Nombre"    value={form.businessName} />
                  <SummaryRow label="Tipo"      value={form.businessType === "company" ? "Empresa" : "Autónomo"} />
                  <SummaryRow label="CIF/NIF"   value={form.taxId} />
                  {form.sector && <SummaryRow label="Sector" value={form.sector} />}
                </div>

                {/* Representante */}
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Representante</p>
                  <SummaryRow label="Nombre"    value={`${form.firstName} ${form.lastName}`} />
                  <SummaryRow label="Nacimiento" value={`${form.dobDay}/${form.dobMonth}/${form.dobYear}`} />
                  <SummaryRow label="Dirección" value={`${form.address}, ${form.city} ${form.postalCode}`} />
                  <SummaryRow label="Teléfono"  value={form.phone} />
                </div>

                {/* Banco */}
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cuenta bancaria</p>
                  <SummaryRow label="IBAN"     value={`****${form.iban.replace(/\s/g, "").slice(-4)}`} mono />
                  <SummaryRow label="Titular"  value={form.accountHolder || `${form.firstName} ${form.lastName}`} />
                </div>
              </div>

              {/* Términos */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(e) => set("acceptedTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-slate-800 cursor-pointer"
                />
                <span className="text-[12px] text-slate-600 leading-relaxed">
                  He leído y acepto los{" "}
                  <a href="/terms" target="_blank" className="text-blue-600 underline">términos del servicio</a>{" "}
                  y la{" "}
                  <a href="/privacy" target="_blank" className="text-blue-600 underline">política de privacidad</a>{" "}
                  de PayForce.
                </span>
              </label>
            </>
          )}
        </div>

        {/* Navegación */}
        <div className="mt-4 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-[#1d1d1f] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.acceptedTerms}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-[#0071e3] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0077ed] disabled:opacity-60 transition-colors"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Activando cuenta…</>
                : <><CheckCircle2 className="h-4 w-4" /> Activar mi cuenta</>
              }
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          <Shield className="inline h-3 w-3 mr-1" />
          Tus datos están protegidos con cifrado de extremo a extremo
        </p>

      </div>
    </div>
  );
}

// ── Fila de resumen ───────────────────────────────────────────────────────────
function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={`text-[12px] font-medium text-slate-700 ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
