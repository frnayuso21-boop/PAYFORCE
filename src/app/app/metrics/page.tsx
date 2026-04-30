"use client";
import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";

type DashData = {
 totalRevenue?: number; monthRevenue?: number; totalPayments?: number;
 monthPayments?: number; avgTicket?: number; totalCustomers?: number;
 successRate?: number;
};

function fmt(cents: number) {
 return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR"});
}

function MetricCard({ label, value, sub, color = "text-slate-900"}: {
 label: string; value: string; sub?: string; color?: string;
}) {
 return (
 <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
 <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
 <p className={`text-[28px] font-bold ${color}`}>{value}</p>
 {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
 </div>
 );
}

export default function MetricsPage() {
 const [data, setData] = useState<DashData>({});
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch("/api/dashboard")
 .then((r) => r.json())
 .then(setData)
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 return (
 <div className="min-h-screen bg-[#f8f9fb] p-8">
 <div className="mb-7">
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <TrendingUp className="h-5 w-5 text-slate-400"/> Métricas
 </h1>
 <p className="text-[13px] text-slate-400 mt-0.5">Indicadores clave de rendimiento de tu negocio</p>
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-20">
 <RefreshCw className="h-6 w-6 animate-spin text-slate-300"/>
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-4">
 <MetricCard
 label="Ingresos totales"color="text-emerald-600"value={fmt(data.totalRevenue ?? 0)}
 sub="Desde el inicio"/>
 <MetricCard
 label="Este mes"value={fmt(data.monthRevenue ?? 0)}
 />
 <MetricCard
 label="Ticket medio"value={fmt(data.avgTicket ?? 0)}
 />
 <MetricCard
 label="Pagos totales"value={(data.totalPayments ?? 0).toLocaleString("es-ES")}
 sub="Transacciones procesadas"/>
 <MetricCard
 label="Pagos este mes"value={(data.monthPayments ?? 0).toLocaleString("es-ES")}
 />
 <MetricCard
 label="Clientes"value={(data.totalCustomers ?? 0).toLocaleString("es-ES")}
 sub="Clientes únicos"/>
 <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm col-span-3">
 <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Tasa de éxito</p>
 <div className="flex items-center gap-4">
 <p className="text-[28px] font-normal text-slate-900">
 {(data.successRate ?? 0).toFixed(1)}%
 </p>
 <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-emerald-400 rounded-full transition-all duration-500"style={{ width: `${data.successRate ?? 0}%`}}
 />
 </div>
 </div>
 <p className="text-[11px] text-slate-400 mt-1">Pagos completados sobre el total iniciado</p>
 </div>
 </div>
 )}
 </div>
 );
}
