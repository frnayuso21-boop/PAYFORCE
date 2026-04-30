"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { useManagers } from "@/hooks/useData";
import {
 UserPlus, Send, Trash2, ToggleLeft, ToggleRight,
 Mail, Clock, ChevronDown, X, Loader2, CheckCircle2,
} from "lucide-react";

// Tipos 
interface Manager {
 id: string;
 name: string;
 email: string;
 role: string;
 reportFrequency: string;
 reportFormat: string;
 reportDay: number;
 active: boolean;
 lastReportSentAt: string | null;
 createdAt: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
 daily: "Diario",
 weekly: "Semanal",
 monthly: "Mensual",
};

const DAY_LABELS: Record<number, string> = {
 1: "Lunes", 2: "Martes", 3: "Miércoles",
 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo",
};

// Modal añadir gestor 
function AddManagerModal({
 onClose,
 onCreated,
}: {
 onClose: () => void;
 onCreated: (m: Manager) => void;
}) {
 const [form, setForm] = useState({
 name: "",
 email: "",
 reportFrequency: "weekly",
 reportFormat: "csv",
 reportDay: 1,
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
 setForm((prev) => ({ ...prev, [key]: value }));
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError("");
 if (!form.name.trim() || !form.email.trim()) {
 setError("Nombre y email son obligatorios.");
 return;
 }
 setLoading(true);
 try {
 const res = await fetch("/api/dashboard/managers", {
 method: "POST",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify(form),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error ?? "Error al crear gestor");
 onCreated(data.manager);
 onClose();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Error al crear gestor");
 } finally {
 setLoading(false);
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
 <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="text-[16px] font-semibold text-slate-900">Añadir gestor</h2>
 <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors">
 <X className="h-4 w-4"/>
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Nombre *</label>
 <input
 type="text"value={form.name} onChange={(e) => set("name", e.target.value)}
 placeholder="María García"className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition"/>
 </div>

 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Email *</label>
 <input
 type="email"value={form.email} onChange={(e) => set("email", e.target.value)}
 placeholder="maria@empresa.com"className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition"/>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Frecuencia</label>
 <div className="relative">
 <select
 value={form.reportFrequency}
 onChange={(e) => set("reportFrequency", e.target.value)}
 className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition pr-8">
 <option value="daily">Diario</option>
 <option value="weekly">Semanal</option>
 <option value="monthly">Mensual</option>
 </select>
 <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/>
 </div>
 </div>

 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Formato</label>
 <div className="relative">
 <select
 value={form.reportFormat}
 onChange={(e) => set("reportFormat", e.target.value)}
 className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition pr-8">
 <option value="csv">CSV</option>
 </select>
 <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/>
 </div>
 </div>
 </div>

 {form.reportFrequency === "weekly"&& (
 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Día de envío</label>
 <div className="relative">
 <select
 value={form.reportDay}
 onChange={(e) => set("reportDay", Number(e.target.value))}
 className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition pr-8">
 {Object.entries(DAY_LABELS).map(([v, label]) => (
 <option key={v} value={Number(v)}>{label}</option>
 ))}
 </select>
 <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/>
 </div>
 </div>
 )}

 {error && (
 <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-600">{error}</p>
 )}

 <div className="flex justify-end gap-2 pt-2">
 <button type="button"onClick={onClose}
 className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
 Cancelar
 </button>
 <button type="submit"disabled={loading}
 className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-700 disabled:opacity-60 transition-colors">
 {loading && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}
 Añadir gestor
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}

// Vista previa de email 
function EmailPreviewModal({ manager, onClose }: { manager: Manager; onClose: () => void }) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
 <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
 <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
 <div>
 <h2 className="text-[14px] font-semibold text-slate-900">Vista previa del email</h2>
 <p className="text-[12px] text-slate-500">Para: {manager.email}</p>
 </div>
 <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors">
 <X className="h-4 w-4"/>
 </button>
 </div>
 <div className="max-h-[70vh] overflow-y-auto p-5 bg-[#f5f5f7]">
 <div className="rounded-2xl overflow-hidden bg-white shadow-sm text-[13px]">
 <div className="bg-[#1d1d1f] px-6 py-5">
 <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] mb-2">PayForce</p>
 <h3 className="text-[18px] font-normal text-white mb-1">Informe semanal</h3>
 <p className="text-[12px] text-[#86868b]">Semana del 21 al 27 de abril</p>
 </div>
 <div className="px-6 py-5 space-y-4">
 <p className="text-slate-700">
 Hola <strong>{manager.name}</strong>,
 </p>
 <p className="text-slate-500 leading-relaxed text-[12px]">
 Aquí tienes el informe de ventas de <strong>Tu negocio</strong> correspondiente a la semana del 21 al 27 de abril.
 </p>
 <div className="grid grid-cols-2 gap-3">
 {[
 { label: "Total cobrado", value: "1.234,56€"},
 { label: "Transacciones", value: "47"},
 ].map((m) => (
 <div key={m.label} className="bg-[#f5f5f7] rounded-xl p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868b] mb-1">{m.label}</p>
 <p className="text-[20px] font-bold text-[#1d1d1f]">{m.value}</p>
 </div>
 ))}
 </div>
 <div className="bg-[#f5f5f7] rounded-xl px-4 py-3 flex items-center gap-2">
 <span className="text-[12px] text-slate-500">vs semana anterior:</span>
 <span className="text-[14px] font-normal text-green-600">+12,3%</span>
 </div>
 <p className="text-[12px] text-slate-500 leading-relaxed">
 Adjunto encontrarás el detalle completo en formato CSV.
 </p>
 <div>
 <span className="inline-block bg-[#0071e3] text-white text-[13px] font-semibold rounded-full px-5 py-2.5">
 Ver dashboard completo →
 </span>
 </div>
 </div>
 <div className="bg-[#f5f5f7] border-t border-slate-100 px-6 py-3">
 <p className="text-[10px] text-[#86868b]">
 Has recibido este informe porque estás configurado como gestor en PayForce.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

// Página principal 
const MANAGERS_KEY = "/api/dashboard/managers";

export default function ManagersPage() {
 const [showAdd, setShowAdd] = useState(false);
 const [previewManager, setPreviewManager] = useState<Manager | null>(null);
 const [sending, setSending] = useState<string | null>(null);
 const [sentFeedback, setSentFeedback] = useState<string | null>(null);
 const [toggling, setToggling] = useState<string | null>(null);
 const [deleting, setDeleting] = useState<string | null>(null);

 const { data: mgData, isLoading: loading } = useManagers();
 const managers: Manager[] = mgData?.managers ?? [];

 function loadManagers() { void swrMutate(MANAGERS_KEY); }

 async function handleToggle(manager: Manager) {
 setToggling(manager.id);
 try {
 const res = await fetch(`/api/dashboard/managers/${manager.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({ active: !manager.active }),
 });
 if (!res.ok) return;
 void swrMutate(MANAGERS_KEY);
 } finally {
 setToggling(null);
 }
 }

 async function handleDelete(id: string) {
 if (!confirm("¿Eliminar este gestor?")) return;
 setDeleting(id);
 try {
 const res = await fetch(`/api/dashboard/managers/${id}`, { method: "DELETE"});
 if (!res.ok) return;
 void swrMutate(MANAGERS_KEY);
 } finally {
 setDeleting(null);
 }
 }

 async function handleSendNow(id: string) {
 setSending(id);
 setSentFeedback(null);
 try {
 const res = await fetch(`/api/dashboard/managers/${id}/report`, { method: "POST"});
 const data = await res.json();
 if (!res.ok) throw new Error(data.error);
 void swrMutate(MANAGERS_KEY);
 setSentFeedback(id);
 setTimeout(() => setSentFeedback(null), 3000);
 } catch (err) {
 alert(err instanceof Error ? err.message : "Error al enviar");
 } finally {
 setSending(null);
 }
 }

 function formatDate(iso: string | null) {
 if (!iso) return "—";
 return new Date(iso).toLocaleDateString("es-ES", {
 day: "2-digit", month: "short", year: "numeric",
 hour: "2-digit", minute: "2-digit",
 });
 }

 return (
 <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
 <div className="mx-auto max-w-4xl space-y-6">

 {/* Cabecera */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">Gestores</h1>
 <p className="mt-1 text-[13px] text-[#6e6e73]">
 Personas que reciben informes automáticos de ventas sin acceso al dashboard.
 </p>
 </div>
 <button
 onClick={() => setShowAdd(true)}
 className="flex items-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0077ed] transition-colors">
 <UserPlus className="h-3.5 w-3.5"/>
 Añadir gestor
 </button>
 </div>

 {/* Tabla */}
 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
 {loading ? (
 <div className="space-y-3 p-6">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-100"/>
 ))}
 </div>
 ) : managers.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
 <Mail className="h-5 w-5 text-slate-400"/>
 </div>
 <p className="text-[14px] font-medium text-slate-700">Sin gestores todavía</p>
 <p className="mt-1 text-[12px] text-slate-400">
 Añade un gestor para enviarle informes automáticos de ventas.
 </p>
 <button
 onClick={() => setShowAdd(true)}
 className="mt-4 flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-700 transition-colors">
 <UserPlus className="h-3.5 w-3.5"/> Añadir gestor
 </button>
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="border-b border-slate-100">
 {["Nombre", "Email", "Frecuencia", "Formato", "Último informe", "Acciones"].map((h) => (
 <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
 {h}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {managers.map((manager, i) => (
 <tr
 key={manager.id}
 className={`transition-colors hover:bg-slate-50 ${i !== managers.length - 1 ? "border-b border-slate-100": ""}`}
 >
 {/* Nombre */}
 <td className="px-5 py-4">
 <div className="flex items-center gap-2.5">
 <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
 {manager.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="text-[13px] font-medium text-slate-900 leading-tight">{manager.name}</p>
 {!manager.active && (
 <span className="text-[10px] font-medium text-slate-400">Inactivo</span>
 )}
 </div>
 </div>
 </td>

 {/* Email */}
 <td className="px-5 py-4">
 <span className="text-[13px] text-slate-600">{manager.email}</span>
 </td>

 {/* Frecuencia */}
 <td className="px-5 py-4">
 <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
 <Clock className="h-3 w-3"/>
 {FREQUENCY_LABELS[manager.reportFrequency] ?? manager.reportFrequency}
 {manager.reportFrequency === "weekly"&& `· ${DAY_LABELS[manager.reportDay]}`}
 </span>
 </td>

 {/* Formato */}
 <td className="px-5 py-4">
 <span className="text-[12px] font-mono font-semibold text-slate-500 uppercase">
 {manager.reportFormat}
 </span>
 </td>

 {/* Último informe */}
 <td className="px-5 py-4">
 <span className="text-[12px] text-slate-500">{formatDate(manager.lastReportSentAt)}</span>
 </td>

 {/* Acciones */}
 <td className="px-5 py-4">
 <div className="flex items-center gap-2">
 {/* Enviar ahora */}
 <button
 onClick={() => handleSendNow(manager.id)}
 disabled={sending === manager.id}
 title="Enviar informe ahora"className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
 {sending === manager.id ? (
 <Loader2 className="h-3 w-3 animate-spin"/>
 ) : sentFeedback === manager.id ? (
 <CheckCircle2 className="h-3 w-3 text-green-500"/>
 ) : (
 <Send className="h-3 w-3"/>
 )}
 {sentFeedback === manager.id ? "Enviado": "Enviar"}
 </button>

 {/* Vista previa */}
 <button
 onClick={() => setPreviewManager(manager)}
 title="Vista previa email"className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition-colors">
 <Mail className="h-3.5 w-3.5"/>
 </button>

 {/* Toggle activo */}
 <button
 onClick={() => handleToggle(manager)}
 disabled={toggling === manager.id}
 title={manager.active ? "Desactivar": "Activar"}
 className="rounded-lg border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 disabled:opacity-50">
 {manager.active ? (
 <ToggleRight className="h-3.5 w-3.5 text-green-500"/>
 ) : (
 <ToggleLeft className="h-3.5 w-3.5 text-slate-400"/>
 )}
 </button>

 {/* Eliminar */}
 <button
 onClick={() => handleDelete(manager.id)}
 disabled={deleting === manager.id}
 title="Eliminar gestor"className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors">
 {deleting === manager.id ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin"/>
 ) : (
 <Trash2 className="h-3.5 w-3.5"/>
 )}
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {/* Info cron */}
 <div className="rounded-2xl border border-slate-200 bg-white p-5">
 <h2 className="mb-1 text-[13px] font-semibold text-slate-800">Envío automático</h2>
 <p className="text-[12px] text-slate-500 leading-relaxed">
 Los informes semanales se envían automáticamente cada <strong>lunes a las 8:00</strong> con el
 resumen de la semana anterior. Puedes usar el botón <em>Enviar</em> para mandar el informe
 en cualquier momento.
 </p>
 </div>

 </div>

 {showAdd && (
 <AddManagerModal
 onClose={() => setShowAdd(false)}
 onCreated={() => { void swrMutate(MANAGERS_KEY); setShowAdd(false); }}
 />
 )}

 {previewManager && (
 <EmailPreviewModal
 manager={previewManager}
 onClose={() => setPreviewManager(null)}
 />
 )}
 </div>
 );
}
