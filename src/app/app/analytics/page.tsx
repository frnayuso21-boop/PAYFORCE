"use client";
import { useEffect, useState } from "react";
import { BarChart2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

type Stats = {
 totalRevenue: number; monthRevenue: number; prevMonthRevenue: number;
 totalPayments: number; monthPayments: number;
 avgTicket: number; topDays: { date: string; amount: number }[];
};

function fmt(cents: number) {
 return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR"});
}

function Trend({ current, prev }: { current: number; prev: number }) {
 if (!prev) return null;
 const pct = ((current - prev) / prev) * 100;
 const up = pct >= 0;
 return (
 <span className={`ml-2 inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-600": "text-red-500"}`}>
 {up ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
 {Math.abs(pct).toFixed(1)}%
 </span>
 );
}

export default function AnalyticsPage() {
 const [stats, setStats] = useState<Stats | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch("/api/dashboard")
 .then((r) => r.json())
 .then((d) => {
 setStats({
 totalRevenue: d.totalRevenue ?? 0,
 monthRevenue: d.monthRevenue ?? 0,
 prevMonthRevenue:d.prevMonthRevenue?? 0,
 totalPayments: d.totalPayments ?? 0,
 monthPayments: d.monthPayments ?? 0,
 avgTicket: d.avgTicket ?? 0,
 topDays: d.topDays ?? [],
 });
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 return (
 <div className="min-h-screen bg-[#f8f9fb] p-8">
 <div className="mb-7">
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <BarChart2 className="h-5 w-5 text-slate-400"/> Análisis
 </h1>
 <p className="text-[13px] text-slate-400 mt-0.5">Evolución de tu negocio en PayForce</p>
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-20">
 <RefreshCw className="h-6 w-6 animate-spin text-slate-300"/>
 </div>
 ) : stats ? (
 <>
 <div className="grid grid-cols-3 gap-4 mb-8">
 {[
 { label: "Ingresos este mes", value: fmt(stats.monthRevenue), sub: <Trend current={stats.monthRevenue} prev={stats.prevMonthRevenue} /> },
 { label: "Pagos este mes", value: String(stats.monthPayments), sub: null },
 { label: "Ticket medio", value: fmt(stats.avgTicket), sub: null },
 ].map((k) => (
 <div key={k.label} className="rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
 <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{k.label}</p>
 <div className="flex items-baseline mt-1">
 <p className="text-[26px] font-normal text-slate-900">{k.value}</p>
 {k.sub}
 </div>
 </div>
 ))}
 </div>

 <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
 <h2 className="text-[14px] font-semibold text-slate-900 mb-5">Totales históricos</h2>
 <div className="grid grid-cols-2 gap-6">
 <div>
 <p className="text-[12px] text-slate-400">Ingresos totales</p>
 <p className="text-[22px] font-bold text-emerald-600 mt-0.5">{fmt(stats.totalRevenue)}</p>
 </div>
 <div>
 <p className="text-[12px] text-slate-400">Pagos procesados</p>
 <p className="text-[22px] font-bold text-slate-900 mt-0.5">{stats.totalPayments.toLocaleString("es-ES")}</p>
 </div>
 </div>
 </div>
 </>
 ) : (
 <p className="text-slate-400 text-center py-20">No hay datos disponibles</p>
 )}
 </div>
 );
}
