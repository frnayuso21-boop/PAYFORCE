"use client";
import { useEffect, useState, useCallback } from "react";
import { Webhook, RefreshCw, CheckCircle, XCircle, SkipForward } from "lucide-react";

type WebhookEvent = {
 id: string; type: string; status: string; processedAt: string; error: string | null;
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
 PROCESSED: <CheckCircle className="h-4 w-4 text-emerald-500"/>,
 FAILED: <XCircle className="h-4 w-4 text-red-500"/>,
 SKIPPED: <SkipForward className="h-4 w-4 text-slate-400"/>,
};

export default function WebhooksPage() {
 const [data, setData] = useState<{ events: WebhookEvent[]; total: number } | null>(null);
 const [status, setStatus] = useState("");
 const [type, setType] = useState("");
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(false);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const params = new URLSearchParams({ status, type, page: String(page) });
 const r = await fetch(`/api/admin/webhooks?${params}`);
 if (r.ok) setData(await r.json());
 } finally {
 setLoading(false);
 }
 }, [status, type, page]);

 useEffect(() => { load(); }, [load]);

 return (
 <div className="p-8">
 <div className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <Webhook className="h-5 w-5 text-slate-500"/>
 Webhooks de Stripe
 </h1>
 <p className="text-[13px] text-slate-400">Log de todos los eventos recibidos de Stripe</p>
 </div>
 <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
 <RefreshCw className="h-4 w-4"/> Actualizar
 </button>
 </div>

 <div className="mb-4 flex items-center gap-3">
 <input
 value={type}
 onChange={(e) => { setType(e.target.value); setPage(1); }}
 placeholder="Filtrar por tipo (ej: payment_intent)"className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none shadow-sm"/>
 <select
 value={status}
 onChange={(e) => { setStatus(e.target.value); setPage(1); }}
 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none shadow-sm">
 <option value="">Todos</option>
 <option value="PROCESSED">PROCESSED</option>
 <option value="FAILED">FAILED</option>
 <option value="SKIPPED">SKIPPED</option>
 </select>
 {data && <span className="text-[13px] text-slate-400 shrink-0">{data.total} eventos</span>}
 </div>

 <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex items-center justify-center py-16">
 <RefreshCw className="h-5 w-5 animate-spin text-slate-300"/>
 </div>
 ) : (
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-slate-100 bg-slate-50">
 <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase w-10">#</th>
 <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
 <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">ID Evento</th>
 <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Error</th>
 <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Procesado</th>
 </tr>
 </thead>
 <tbody>
 {data?.events.map((e) => (
 <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
 <td className="px-5 py-3 text-center">
 {STATUS_ICONS[e.status] ?? <span className="text-slate-300">?</span>}
 </td>
 <td className="px-5 py-3 font-mono text-[12px] text-slate-700">{e.type}</td>
 <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{e.id}</td>
 <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
 {e.error ? (
 <span className="text-red-500">{e.error}</span>
 ) : (
 <span className="text-slate-200">—</span>
 )}
 </td>
 <td className="px-5 py-3 text-right text-slate-400">
 {new Date(e.processedAt).toLocaleDateString("es-ES", {
 day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
 })}
 </td>
 </tr>
 ))}
 {(!data?.events.length) && (
 <tr>
 <td colSpan={5} className="px-5 py-12 text-center text-slate-300">Sin eventos registrados</td>
 </tr>
 )}
 </tbody>
 </table>
 )}
 </div>

 {data && data.total > 30 && (
 <div className="mt-4 flex items-center justify-center gap-3">
 <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
 className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30">← Anterior</button>
 <span className="text-[13px] text-slate-400">Página {page} de {Math.ceil(data.total / 30)}</span>
 <button disabled={page * 30 >= data.total} onClick={() => setPage(p => p + 1)}
 className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30">Siguiente →</button>
 </div>
 )}
 </div>
 );
}
