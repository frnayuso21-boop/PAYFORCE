"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
 Building2, Globe, Briefcase, Layers, Check,
 ArrowRight, ChevronRight, X, Zap, TestTube2,
 CreditCard, RefreshCw, Receipt, BarChart3,
 Store, Smartphone, ShieldCheck, AlertTriangle,
 Landmark, BadgeDollarSign, Leaf, Database, Puzzle,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// Constantes 

const COUNTRIES = [
 { code: "ES", name: "España"},
 { code: "MX", name: "México"},
 { code: "AR", name: "Argentina"},
 { code: "CO", name: "Colombia"},
 { code: "CL", name: "Chile"},
 { code: "PE", name: "Perú"},
 { code: "BR", name: "Brasil"},
 { code: "US", name: "Estados Unidos"},
 { code: "GB", name: "Reino Unido"},
 { code: "DE", name: "Alemania"},
 { code: "FR", name: "Francia"},
 { code: "IT", name: "Italia"},
 { code: "PT", name: "Portugal"},
 { code: "NL", name: "Países Bajos"},
 { code: "CH", name: "Suiza"},
 { code: "CA", name: "Canadá"},
 { code: "AU", name: "Australia"},
 { code: "OTHER", name: "Otro"},
];

const COMPANY_TYPES = [
 { value: "FREELANCER", label: "Autónomo / Freelance", icon: Briefcase },
 { value: "COMPANY", label: "Empresa", icon: Building2 },
 { value: "STARTUP", label: "Startup", icon: Zap },
 { value: "MARKETPLACE",label: "Plataforma / Marketplace", icon: Layers },
 { value: "OTHER", label: "Otro", icon: Globe },
];

const FEATURES = [
 { id: "one_time", label: "Pagos únicos", icon: CreditCard, desc: "Cobra un importe en un solo paso"},
 { id: "recurring", label: "Pagos recurrentes", icon: RefreshCw, desc: "Suscripciones y cobros periódicos"},
 { id: "billing", label: "Facturación", icon: Receipt, desc: "Emite facturas a tus clientes"},
 { id: "metered", label: "Facturación por uso", icon: BarChart3, desc: "Cobra en función del consumo"},
 { id: "platform", label: "Plataforma / Marketplace", icon: Store, desc: "Gestiona pagos entre terceros"},
 { id: "in_person", label: "Pagos en persona", icon: Smartphone, desc: "Terminal o punto de venta físico"},
 { id: "identity", label: "Verificación de identidad",icon: ShieldCheck, desc: "Verifica la identidad de tus usuarios"},
 { id: "fraud", label: "Protección antifraude", icon: AlertTriangle, desc: "Detecta y previene el fraude"},
 { id: "tax", label: "Cobro de impuestos", icon: Landmark, desc: "Calcula y recauda el IVA / tax"},
 { id: "cards", label: "Emisión de tarjetas", icon: BadgeDollarSign, desc: "Emite tarjetas para tu negocio"},
 { id: "climate", label: "Climate", icon: Leaf, desc: "Aportaciones por el clima"},
 { id: "open_banking",label: "Datos bancarios", icon: Database, desc: "Conecta con cuentas bancarias"},
 { id: "embed", label: "Integración en plataforma",icon: Puzzle, desc: "Integra PayForce en otra app"},
];

// Tipos 

interface OnboardingData {
 companyName: string;
 companyCountry: string;
 companyCity: string;
 website: string;
 companyType: string;
 selectedFeatures: string[];
}

interface OnboardingModalProps {
 onComplete: (mode: "test"| "live") => void;
}

// Animación de pasos 

const STEP_VARIANTS = {
 enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
 center: { x: 0, opacity: 1 },
 exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const STEP_TRANSITION = { duration: 0.22, ease: "easeInOut"as const };

// Barra de progreso 
function ProgressBar({ current, total }: { current: number; total: number }) {
 const pct = Math.round((current / total) * 100);
 return (
 <div className="h-1 w-full rounded-full bg-slate-100">
 <motion.div
 className="h-1 rounded-full bg-slate-900"animate={{ width: `${pct}%`}}
 transition={{ duration: 0.3 }}
 />
 </div>
 );
}

// Modal principal 

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
 const [step, setStep] = useState(0);
 const [dir, setDir] = useState(1);
 const [saving, setSaving] = useState(false);
 const [data, setData] = useState<OnboardingData>({
 companyName: "",
 companyCountry: "ES",
 companyCity: "",
 website: "",
 companyType: "",
 selectedFeatures: [],
 });

 const TOTAL_STEPS = 5; // pasos 1-5 (step 0 = welcome)

 const goNext = useCallback((n = 1) => {
 setDir(1);
 setStep((s) => s + n);
 }, []);

 const goBack = useCallback(() => {
 setDir(-1);
 setStep((s) => Math.max(0, s - 1));
 }, []);

 const updateData = useCallback((patch: Partial<OnboardingData>) => {
 setData((d) => ({ ...d, ...patch }));
 }, []);

 const toggleFeature = useCallback((id: string) => {
 setData((d) => ({
 ...d,
 selectedFeatures: d.selectedFeatures.includes(id)
 ? d.selectedFeatures.filter((f) => f !== id)
 : [...d.selectedFeatures, id],
 }));
 }, []);

 async function saveAndComplete(mode: "test"| "live") {
 setSaving(true);
 try {
 await fetch("/api/onboarding/complete", {
 method: "POST",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({ ...data, mode }),
 });
 if (data.companyName) {
 await fetch("/api/onboarding/marketing", {
 method: "POST",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({ source: "onboarding"}),
 });
 }
 } catch {
 // Continuar aunque falle — no bloquear al usuario
 } finally {
 setSaving(false);
 onComplete(mode);
 }
 }

 async function handleSkip() {
 await saveAndComplete("test");
 }

 // Contenido de cada paso 

 const steps: Record<number, React.ReactNode> = {

 // STEP 0 — Welcome
 0: (
 <div className="flex flex-col items-center text-center gap-5 py-4">
 <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
 <Zap className="h-8 w-8 text-white"/>
 </div>
 <div>
 <h2 className="text-2xl font-bold text-slate-900">Te damos la bienvenida a PayForce</h2>
 <p className="mt-2 text-[15px] text-slate-500 leading-relaxed">
 Responde unas preguntas rápidas para configurar tu cuenta y empezar a cobrar.
 </p>
 </div>
 <div className="mt-1 w-full space-y-2.5">
 {[
 "Solo tarda 2 minutos",
 "Puedes modificarlo después en ajustes",
 "Tu cuenta queda lista para el entorno de prueba",
 ].map((item) => (
 <div key={item} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-2.5 text-left">
 <Check className="h-4 w-4 shrink-0 text-emerald-500"strokeWidth={2.5} />
 <span className="text-sm text-slate-600">{item}</span>
 </div>
 ))}
 </div>
 <button
 onClick={() => goNext()}
 className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
 Comenzar
 <ArrowRight className="h-4 w-4"/>
 </button>
 </div>
 ),

 // STEP 1 — Información de empresa
 1: (
 <div className="space-y-5">
 <div>
 <h3 className="text-lg font-semibold text-slate-900">¿Cómo se llama tu empresa?</h3>
 <p className="mt-1 text-sm text-slate-500">Esto aparecerá en los recibos de tus clientes.</p>
 </div>
 <div className="space-y-3">
 <div className="space-y-1.5">
 <label className="block text-sm font-medium text-slate-700">Nombre de la empresa</label>
 <input
 type="text"placeholder="Empresa S.L."value={data.companyName}
 onChange={(e) => updateData({ companyName: e.target.value })}
 className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"/>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="block text-sm font-medium text-slate-700">País</label>
 <select
 value={data.companyCountry}
 onChange={(e) => updateData({ companyCountry: e.target.value })}
 className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors appearance-none"style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center"}}
 >
 {COUNTRIES.map((c) => (
 <option key={c.code} value={c.code}>{c.name}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="block text-sm font-medium text-slate-700">Ciudad <span className="text-slate-400">(opcional)</span></label>
 <input
 type="text"placeholder="Madrid"value={data.companyCity}
 onChange={(e) => updateData({ companyCity: e.target.value })}
 className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"/>
 </div>
 </div>
 </div>
 <StepFooter
 onNext={() => goNext()}
 onSkip={handleSkip}
 nextDisabled={!data.companyName.trim()}
 />
 </div>
 ),

 // STEP 2 — Sitio web
 2: (
 <div className="space-y-5">
 <div>
 <h3 className="text-lg font-semibold text-slate-900">¿Tiene sitio web tu empresa?</h3>
 <p className="mt-1 text-sm text-slate-500">Opcional, pero ayuda a personalizar tu experiencia.</p>
 </div>
 <div className="space-y-1.5">
 <label className="block text-sm font-medium text-slate-700">Sitio web <span className="text-slate-400">(opcional)</span></label>
 <div className="relative">
 <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">https://</span>
 <input
 type="text"placeholder="tuempresa.com"value={data.website}
 onChange={(e) => updateData({ website: e.target.value })}
 className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-[70px] pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"/>
 </div>
 </div>
 <StepFooter onNext={() => goNext()} onSkip={handleSkip} />
 </div>
 ),

 // STEP 3 — Tipo de empresa
 3: (
 <div className="space-y-5">
 <div>
 <h3 className="text-lg font-semibold text-slate-900">¿Qué tipo de empresa es?</h3>
 <p className="mt-1 text-sm text-slate-500">Esto nos ayuda a mostrarte las funciones más relevantes.</p>
 </div>
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
 {COMPANY_TYPES.map(({ value, label, icon: Icon }) => {
 const selected = data.companyType === value;
 return (
 <button
 key={value}
 type="button"onClick={() => updateData({ companyType: value })}
 className={cn(
 "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150",
 selected
 ? "border-slate-900 bg-slate-900 text-white shadow-sm": "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
 )}
 >
 <div className={cn(
 "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
 selected ? "bg-white/15": "bg-slate-100",
 )}>
 <Icon className={cn("h-4 w-4", selected ? "text-white": "text-slate-600")} />
 </div>
 <span className="text-sm font-medium">{label}</span>
 {selected && <Check className="ml-auto h-4 w-4 text-white"strokeWidth={2.5} />}
 </button>
 );
 })}
 </div>
 <StepFooter
 onNext={() => goNext()}
 onSkip={handleSkip}
 nextDisabled={!data.companyType}
 />
 </div>
 ),

 // STEP 4 — Selección de producto
 4: (
 <div className="space-y-5">
 <div>
 <h3 className="text-lg font-semibold text-slate-900">¿Cómo quieres usar PayForce?</h3>
 <p className="mt-1 text-sm text-slate-500">Selecciona las funciones que necesitas. Puedes añadir más en cualquier momento.</p>
 </div>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
 {FEATURES.map(({ id, label, icon: Icon, desc }) => {
 const selected = data.selectedFeatures.includes(id);
 return (
 <button
 key={id}
 type="button"onClick={() => toggleFeature(id)}
 className={cn(
 "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all duration-150",
 selected
 ? "border-slate-900 bg-slate-900 text-white shadow-sm": "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
 )}
 >
 <div className="flex items-center justify-between">
 <div className={cn(
 "flex h-7 w-7 items-center justify-center rounded-lg",
 selected ? "bg-white/15": "bg-slate-100",
 )}>
 <Icon className={cn("h-3.5 w-3.5", selected ? "text-white": "text-slate-600")} />
 </div>
 {selected && (
 <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
 <Check className="h-2.5 w-2.5 text-white"strokeWidth={3} />
 </div>
 )}
 </div>
 <div>
 <p className={cn("text-[12px] font-semibold leading-tight", selected ? "text-white": "text-slate-800")}>
 {label}
 </p>
 <p className={cn("mt-0.5 text-[11px] leading-snug", selected ? "text-white/70": "text-slate-400")}>
 {desc}
 </p>
 </div>
 </button>
 );
 })}
 </div>
 <StepFooter onNext={() => goNext()} onSkip={handleSkip} />
 </div>
 ),

 // STEP 5 — Modo prueba vs activar
 5: (
 <div className="space-y-5">
 <div>
 <h3 className="text-lg font-semibold text-slate-900">Elige cómo empezar</h3>
 <p className="mt-1 text-sm text-slate-500">Siempre puedes cambiar esto más adelante desde ajustes.</p>
 </div>
 <div className="space-y-3">
 {/* Opción A: Modo prueba */}
 <button
 type="button"onClick={() => saveAndComplete("test")}
 disabled={saving}
 className="group w-full rounded-xl border-2 border-slate-200 bg-white p-5 text-left transition-all hover:border-slate-900 hover:shadow-sm disabled:opacity-50">
 <div className="flex items-start gap-4">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0 group-hover:bg-blue-100 transition-colors">
 <TestTube2 className="h-5 w-5 text-blue-600"/>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-slate-900">Ir a entorno de prueba</p>
 <p className="mt-1 text-sm text-slate-500 leading-snug">
 Prueba todas las funcionalidades sin mover dinero real. Ideal para integrarte.
 </p>
 <div className="mt-2.5 flex flex-wrap gap-1.5">
 {["API de sandbox", "Pagos de prueba", "Sin límites"].map((tag) => (
 <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
 {tag}
 </span>
 ))}
 </div>
 </div>
 <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-700 transition-colors"/>
 </div>
 </button>

 {/* Opción B: Activar cuenta */}
 <button
 type="button"onClick={() => saveAndComplete("live")}
 disabled={saving}
 className="group w-full rounded-xl bg-slate-900 p-5 text-left transition-all hover:bg-slate-800 disabled:opacity-50">
 <div className="flex items-start gap-4">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shrink-0">
 <Zap className="h-5 w-5 text-white"/>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-white">Activar cuenta ahora</p>
 <p className="mt-1 text-sm text-white/70 leading-snug">
 Completa la verificación y empieza a aceptar pagos reales hoy.
 </p>
 <div className="mt-2.5 flex flex-wrap gap-1.5">
 {["Cobros reales", "Payouts a cuenta", "Cuenta activa"].map((tag) => (
 <span key={tag} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
 {tag}
 </span>
 ))}
 </div>
 </div>
 <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/40 group-hover:text-white transition-colors"/>
 </div>
 </button>
 </div>

 {saving && (
 <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
 <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"/>
 Guardando configuración…
 </div>
 )}
 </div>
 ),
 };

 return (
 <DialogPrimitive.Root open onOpenChange={() => {}}>

 <DialogPrimitive.Portal>
 <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
 <DialogPrimitive.Content
 onPointerDownOutside={(e) => e.preventDefault()}
 onEscapeKeyDown={(e) => e.preventDefault()}
 onInteractOutside={(e) => e.preventDefault()}
 className={cn(
 "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
 "w-[calc(100vw-2rem)] max-w-lg",
 "max-h-[calc(100vh-4rem)] overflow-y-auto",
 "rounded-2xl bg-white shadow-2xl",
 "focus:outline-none",
 "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
 "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
 "[scrollbar-width:thin]",
 )}
 aria-describedby={undefined}
 >
 <DialogPrimitive.Title className="sr-only">
 Configuración inicial de PayForce
 </DialogPrimitive.Title>

 {/* Header con progreso */}
 {step > 0 && (
 <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 {step > 1 && (
 <button
 onClick={goBack}
 className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
 <svg width="16"height="16"viewBox="0 0 16 16"fill="none">
 <path d="M10 12L6 8l4-4"stroke="currentColor"strokeWidth="1.5"strokeLinecap="round"strokeLinejoin="round"/>
 </svg>
 </button>
 )}
 <span className="text-[12px] font-medium text-slate-400">
 Paso {step} de {TOTAL_STEPS}
 </span>
 </div>
 <button
 onClick={handleSkip}
 className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
 Omitir todo
 <X className="h-3.5 w-3.5"/>
 </button>
 </div>
 <ProgressBar current={step} total={TOTAL_STEPS} />
 </div>
 )}

 {/* Contenido del paso */}
 <div className="px-6 py-6 overflow-hidden">
 <AnimatePresence mode="wait"custom={dir}>
 <motion.div
 key={step}
 custom={dir}
 variants={STEP_VARIANTS}
 initial="enter"animate="center"exit="exit"transition={STEP_TRANSITION}
 >
 {steps[step]}
 </motion.div>
 </AnimatePresence>
 </div>
 </DialogPrimitive.Content>
 </DialogPrimitive.Portal>
 </DialogPrimitive.Root>
 );
}

// Footer de pasos 

function StepFooter({
 onNext,
 onSkip,
 nextDisabled = false,
 nextLabel = "Continuar",
}: {
 onNext: () => void;
 onSkip: () => void;
 nextDisabled?: boolean;
 nextLabel?: string;
}) {
 return (
 <div className="flex items-center justify-between gap-3 pt-1">
 <button
 type="button"onClick={onSkip}
 className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
 Omitir
 </button>
 <button
 type="button"onClick={onNext}
 disabled={nextDisabled}
 className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40">
 {nextLabel}
 <ArrowRight className="h-4 w-4"/>
 </button>
 </div>
 );
}
