"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
 Globe, Eye, Check, Loader2, Copy, ExternalLink,
 ToggleLeft, ToggleRight, AlertCircle, Palette, Info,
} from "lucide-react";
import Link from "next/link";

// Tipos 

interface StoreConfig {
 slug: string | null;
 storeDescription: string | null;
 primaryColor: string | null;
 storeEnabled: boolean;
 businessName: string;
}

// Colores predefinidos 

const PRESET_COLORS = [
 "#0f172a", "#6366f1", "#8b5cf6", "#ec4899",
 "#f43f5e", "#f59e0b", "#10b981", "#06b6d4",
 "#3b82f6", "#84cc16",
];

// Componente principal 

export default function StoreSettingsPage() {
 const [config, setConfig] = useState<StoreConfig | null>(null);
 const [slug, setSlug] = useState("");
 const [desc, setDesc] = useState("");
 const [color, setColor] = useState("#0f172a");
 const [enabled, setEnabled] = useState(false);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [copied, setCopied] = useState(false);
 const colorInputRef = useRef<HTMLInputElement>(null);

 // Cargar configuración 
 useEffect(() => {
 fetch("/api/settings/store")
 .then((r) => r.ok ? r.json() : null)
 .then((d: StoreConfig | null) => {
 if (d) {
 setConfig(d);
 setSlug(d.slug ?? "");
 setDesc(d.storeDescription ?? "");
 setColor(d.primaryColor ?? "#0f172a");
 setEnabled(d.storeEnabled);
 }
 })
 .catch(() => null)
 .finally(() => setLoading(false));
 }, []);

 const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? "payforce.io";
 const storeUrl = slug ? `https://${slug}.${appHost}`: null;

 function copyUrl() {
 if (!storeUrl) return;
 navigator.clipboard.writeText(storeUrl).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 });
 }

 async function handleSave() {
 setSaving(true);
 setError(null);
 setSaved(false);

 try {
 const res = await fetch("/api/settings/store", {
 method: "PATCH",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({
 slug: slug.trim().toLowerCase() || undefined,
 storeDescription: desc.trim() || undefined,
 primaryColor: color,
 storeEnabled: enabled,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setError(data.error ?? "Error al guardar");
 } else {
 setConfig(data as StoreConfig);
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 }
 } catch {
 setError("Error de conexión");
 } finally {
 setSaving(false);
 }
 }

 // Validación local del slug 
 const slugValid = !slug || /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(slug);

 if (loading) {
 return (
 <div className="flex min-h-[60vh] items-center justify-center">
 <Loader2 className="h-6 w-6 animate-spin text-slate-400"/>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#f8f9fb] p-6 md:p-8">
 <div className="mx-auto max-w-2xl">

 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-1">
 <Globe className="h-5 w-5 text-slate-400"/>
 <h1 className="text-[22px] font-bold text-slate-900">
 Tu tienda online
 </h1>
 </div>
 <p className="text-[13px] text-slate-400 ml-8">
 Personaliza tu tienda pública y comparte tu URL con clientes
 </p>
 </div>

 {/* Preview de URL */}
 {storeUrl && (
 <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 min-w-0">
 <div
 style={{ background: color }}
 className="h-7 w-7 rounded-lg shrink-0"/>
 <div className="min-w-0">
 <p className="text-[12px] text-slate-400">Tu URL de tienda</p>
 <p className="text-[14px] font-semibold text-slate-800 truncate">
 {storeUrl}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={copyUrl}
 className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition">
 {copied ? <Check className="h-3.5 w-3.5 text-green-600"/> : <Copy className="h-3.5 w-3.5"/>}
 {copied ? "Copiado": "Copiar"}
 </button>
 {enabled && (
 <Link
 href={storeUrl}
 target="_blank"className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition">
 <ExternalLink className="h-3.5 w-3.5"/>
 Ver
 </Link>
 )}
 </div>
 </div>
 )}

 {/* Formulario */}
 <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

 {/* Activar tienda */}
 <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
 <div>
 <p className="text-[14px] font-semibold text-slate-800">
 Tienda pública activa
 </p>
 <p className="text-[12px] text-slate-400 mt-0.5">
 Permite que los clientes visiten tu tienda y realicen pagos
 </p>
 </div>
 <button
 onClick={() => setEnabled((v) => !v)}
 className="shrink-0"aria-label="Activar tienda">
 {enabled
 ? <ToggleRight className="h-8 w-8 text-emerald-500"/>
 : <ToggleLeft className="h-8 w-8 text-slate-300"/>
 }
 </button>
 </div>

 {/* Slug */}
 <div className="px-6 py-5 border-b border-slate-100">
 <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
 Slug de tu tienda (URL personalizada)
 </label>
 <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-slate-800">
 <span className="px-3 py-3 text-[13px] text-slate-400 border-r border-slate-200 shrink-0 bg-white select-none">
 {appHost}/store/
 </span>
 <input
 type="text"placeholder="mi-negocio"value={slug}
 onChange={(e: ChangeEvent<HTMLInputElement>) =>
 setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
 }
 maxLength={63}
 className="flex-1 bg-transparent px-3 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none"/>
 </div>
 {slug && !slugValid && (
 <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-600">
 <AlertCircle className="h-3.5 w-3.5"/>
 Mínimo 3 caracteres, solo minúsculas y guiones. Sin guión al inicio o fin.
 </p>
 )}
 <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
 <Info className="h-3 w-3 shrink-0"/>
 Una vez publicado, tu tienda estará en{""}
 <strong>{slug || "tu-negocio"}.{appHost}</strong>
 </p>
 </div>

 {/* Descripción */}
 <div className="px-6 py-5 border-b border-slate-100">
 <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
 Descripción de la tienda{""}
 <span className="text-slate-400 font-normal normal-case">(opcional)</span>
 </label>
 <textarea
 rows={3}
 placeholder="Describe brevemente tu negocio para tus clientes…"value={desc}
 onChange={(e) => setDesc(e.target.value)}
 maxLength={300}
 className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"/>
 <p className="mt-1 text-right text-[11px] text-slate-400">
 {desc.length}/300
 </p>
 </div>

 {/* Color principal */}
 <div className="px-6 py-5">
 <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 mb-3 uppercase tracking-wide">
 <Palette className="h-3.5 w-3.5"/>
 Color principal de tu marca
 </label>
 <div className="flex flex-wrap items-center gap-2">
 {PRESET_COLORS.map((c) => (
 <button
 key={c}
 type="button"onClick={() => setColor(c)}
 style={{ background: c }}
 className={`h-8 w-8 rounded-xl transition-all ${
 color === c ? "ring-2 ring-offset-2 ring-slate-600 scale-110": "hover:scale-105"}`}
 aria-label={c}
 />
 ))}
 {/* Selector de color personalizado */}
 <button
 type="button"onClick={() => colorInputRef.current?.click()}
 className="relative h-8 w-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-500 transition flex items-center justify-center text-slate-400 text-[10px] font-bold overflow-hidden"aria-label="Color personalizado"title="Color personalizado">
 <span className="text-[9px]">+</span>
 <input
 ref={colorInputRef}
 type="color"value={color}
 onChange={(e) => setColor(e.target.value)}
 className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
 </button>
 {/* Previsualización del color actual */}
 <div className="ml-2 flex items-center gap-2">
 <div
 style={{ background: color }}
 className="h-8 w-8 rounded-xl shadow-sm border border-slate-200"/>
 <span className="text-[12px] font-mono text-slate-600">{color}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Error / Feedback */}
 {error && (
 <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
 <AlertCircle className="h-4 w-4 shrink-0"/>
 {error}
 </div>
 )}

 {/* Botón guardar */}
 <div className="mt-6 flex items-center justify-between">
 <p className="text-[11px] text-slate-400">
 Los cambios son visibles en tiempo real en tu tienda pública.
 </p>
 <button
 onClick={handleSave}
 disabled={saving || !slugValid}
 className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
 {saving ? (
 <><Loader2 className="h-4 w-4 animate-spin"/> Guardando…</>
 ) : saved ? (
 <><Check className="h-4 w-4 text-green-400"/> Guardado</>
 ) : (
 "Guardar cambios")}
 </button>
 </div>

 {/* Info DNS */}
 <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
 <p className="text-[13px] font-semibold text-blue-800 mb-1">
 ¿Cómo funciona el subdominio?
 </p>
 <p className="text-[12px] text-blue-700 leading-relaxed">
 Tu tienda estará disponible en{""}
 <strong>{slug || "tu-slug"}.{appHost}</strong>. Para que funcione,
 en Vercel debes añadir un dominio wildcard <code className="bg-blue-100 px-1 rounded">*.{appHost}</code>{""}
 apuntando a tu proyecto.
 </p>
 </div>

 </div>
 </div>
 );
}
