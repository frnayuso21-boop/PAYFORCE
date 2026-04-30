"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface StatusResult {
 status: string;
 chargesEnabled: boolean;
 payoutsEnabled: boolean;
 detailsSubmitted: boolean;
 requirements: string[];
 requiresAction: boolean;
}

export function SyncStatusButton() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<StatusResult | null>(null);
 const [error, setError] = useState("");

 async function handleSync() {
 setLoading(true);
 setError("");
 setResult(null);
 try {
 const res = await fetch("/api/connect/status");
 const data = await res.json() as StatusResult;
 if (!res.ok) { setError("No se pudo conectar con Stripe"); return; }
 setResult(data);
 // Refresca la página server-side para que los datos de BD sean frescos
 router.refresh();
 } catch {
 setError("Error de conexión");
 } finally {
 setLoading(false);
 }
 }

 if (!result) {
 return (
 <div className="flex flex-col gap-2">
 {error && (
 <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">
 <AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}
 </div>
 )}
 <button
 onClick={handleSync}
 disabled={loading}
 className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
 {loading
 ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400"/>
 : <RefreshCw className="h-3.5 w-3.5 text-slate-400"/>
 }
 {loading ? "Verificando con Stripe…": "Verificar estado con Stripe"}
 </button>
 </div>
 );
 }

 const isEnabled = result.chargesEnabled && result.detailsSubmitted;

 return (
 <div className={`rounded-xl border px-5 py-4 space-y-3 ${
 isEnabled
 ? "border-emerald-200 bg-emerald-50": "border-amber-200 bg-amber-50"}`}>
 <div className="flex items-center gap-2">
 {isEnabled
 ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
 : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0"/>
 }
 <p className={`text-[13px] font-semibold ${isEnabled ? "text-emerald-800": "text-amber-800"}`}>
 {isEnabled
 ? "Cuenta verificada — cobros reales activados": "Verificación incompleta"}
 </p>
 </div>

 <div className="grid grid-cols-3 gap-2">
 {[
 { label: "Cobros", ok: result.chargesEnabled },
 { label: "Pagos", ok: result.payoutsEnabled },
 { label: "Identidad", ok: result.detailsSubmitted },
 ].map(c => (
 <div key={c.label} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ${
 c.ok ? "bg-emerald-100 text-emerald-700": "bg-slate-100 text-slate-400"}`}>
 {c.ok
 ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0"/>
 : <AlertCircle className="h-3.5 w-3.5 shrink-0"/>
 }
 {c.label}
 </div>
 ))}
 </div>

 {result.requirements.length > 0 && (
 <div className="space-y-1">
 <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
 Pendiente de completar:
 </p>
 <ul className="space-y-1">
 {result.requirements.map((r, i) => (
 <li key={i} className="flex items-center gap-2 text-[12px] text-amber-700">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"/>
 {r}
 </li>
 ))}
 </ul>
 </div>
 )}

 <button
 onClick={handleSync}
 disabled={loading}
 className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 transition disabled:opacity-50">
 <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin": ""}`} />
 Actualizar
 </button>
 </div>
 );
}
