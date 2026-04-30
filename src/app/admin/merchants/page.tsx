"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

type Merchant = {
 id: string; email: string; name: string; role: string; createdAt: string;
 connectedAccounts: {
 id: string; businessName: string; status: string;
 chargesEnabled: boolean; payoutsEnabled: boolean;
 _count: { payments: number; paymentLinks: number };
 }[];
};

const STATUS_STYLES: Record<string, string> = {
 ENABLED: "bg-emerald-100 text-emerald-700",
 PENDING: "bg-amber-100 text-amber-700",
 RESTRICTED: "bg-orange-100 text-orange-700",
 NOT_CONNECTED: "bg-slate-100 text-slate-500",
 REJECTED: "bg-red-100 text-red-600",
};

export default function MerchantsPage() {
 const [data, setData] = useState<{ users: Merchant[]; total: number } | null>(null);
 const [q, setQ] = useState("");
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(false);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const url = `/api/admin/merchants?q=${encodeURIComponent(q)}&page=${page}`;
 const r = await fetch(url);
 if (r.ok) setData(await r.json());
 } finally {
 setLoading(false);
 }
 }, [q, page]);

 useEffect(() => { load(); }, [load]);

 return (
 <div className="p-8">
 <div className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-[22px] font-bold text-slate-900">Merchants</h1>
 <p className="text-[13px] text-slate-400">Todos los usuarios de la plataforma</p>
 </div>
 <button onClick={load} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
 <RefreshCw className="h-4 w-4"/> Actualizar
 </button>
 </div>

 {/* Búsqueda */}
 <div className="mb-4 flex items-center gap-3">
 <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
 <Search className="h-4 w-4 text-slate-400 shrink-0"/>
 <input
 value={q}
 onChange={(e) => { setQ(e.target.value); setPage(1); }}
 placeholder="Buscar por email o nombre…"className="flex-1 text-[13px] outline-none placeholder:text-slate-300"/>
 </div>
 {data && (
 <span className="text-[13px] text-slate-400">{data.total} merchants</span>
 )}
 </div>

 {/* Tabla */}
 <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex items-center justify-center py-16">
 <RefreshCw className="h-5 w-5 animate-spin text-slate-300"/>
 </div>
 ) : (
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-slate-100 bg-slate-50">
 <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Merchant</th>
 <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Negocio</th>
 <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
 <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pagos</th>
 <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Links</th>
 <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cobros</th>
 <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Registro</th>
 </tr>
 </thead>
 <tbody>
 {data?.users.map((u) => {
 const acc = u.connectedAccounts[0];
 return (
 <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
 <td className="px-5 py-3.5">
 <p className="font-medium text-slate-900">{u.name || "—"}</p>
 <p className="text-[11px] text-slate-400">{u.email}</p>
 </td>
 <td className="px-5 py-3.5 text-slate-600">
 {acc?.businessName || <span className="text-slate-300">Sin configurar</span>}
 </td>
 <td className="px-5 py-3.5 text-center">
 {acc ? (
 <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[acc.status] ?? "bg-slate-100 text-slate-400"}`}>
 {acc.status}
 </span>
 ) : <span className="text-slate-300">—</span>}
 </td>
 <td className="px-5 py-3.5 text-center font-semibold text-slate-700">
 {acc?._count.payments ?? 0}
 </td>
 <td className="px-5 py-3.5 text-center text-slate-500">
 {acc?._count.paymentLinks ?? 0}
 </td>
 <td className="px-5 py-3.5 text-center">
 {acc?.chargesEnabled
 ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto"/>
 : <XCircle className="h-4 w-4 text-slate-300 mx-auto"/>}
 </td>
 <td className="px-5 py-3.5 text-right text-slate-400">
 {new Date(u.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit"})}
 </td>
 </tr>
 );
 })}
 {(!data?.users.length) && (
 <tr>
 <td colSpan={7} className="px-5 py-10 text-center text-slate-300">
 No se encontraron merchants
 </td>
 </tr>
 )}
 </tbody>
 </table>
 )}
 </div>

 {/* Paginación */}
 {data && data.total > 20 && (
 <div className="mt-4 flex items-center justify-center gap-3">
 <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
 className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-slate-50 transition">
 ← Anterior
 </button>
 <span className="text-[13px] text-slate-400">
 Página {page} de {Math.ceil(data.total / 20)}
 </span>
 <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}
 className="rounded-lg border px-3 py-1.5 text-[13px] disabled:opacity-30 hover:bg-slate-50 transition">
 Siguiente →
 </button>
 </div>
 )}
 </div>
 );
}
