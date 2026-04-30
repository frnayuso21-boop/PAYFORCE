"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
 label: string;
 value: string;
 change?: number;
 note?: string;
 dateRange?: string;
 icon?: React.ReactNode;
}

export function MetricCard({ label, value, change, note, dateRange, icon }: MetricCardProps) {
 const hasChange = change !== undefined && change !== null;

 return (
 <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-3">

 {/* Cabecera */}
 <div className="flex items-center justify-between">
 <p className="text-[12px] font-semibold text-slate-500">{label}</p>
 {icon && (
 <div className="h-7 w-7 rounded-lg flex items-center justify-center"style={{ background: "rgba(59,130,246,0.08)"}}>
 {icon}
 </div>
 )}
 </div>

 {/* Valor */}
 <p className="text-[32px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
 {value}
 </p>

 {/* Badge de cambio */}
 <div className="flex items-center gap-2">
 {hasChange ? (
 <span className={cn(
 "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
 change > 0 ? "bg-emerald-50 text-emerald-700":
 change < 0 ? "bg-red-50 text-red-600": "bg-slate-50 text-slate-500")}>
 {change > 0 ? <TrendingUp className="h-3 w-3"/> :
 change < 0 ? <TrendingDown className="h-3 w-3"/> :
 <Minus className="h-3 w-3"/>}
 {change > 0 ? "+": ""}{change.toFixed(1)}%
 </span>
 ) : null}
 <span className="text-[11px] text-slate-400">
 {hasChange ? "vs mes anterior": (note ?? "—")}
 </span>
 </div>

 {/* Rango de fechas */}
 {dateRange && (
 <p className="flex items-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-50 pt-2 mt-auto">
 <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block"/>
 {dateRange}
 </p>
 )}
 </div>
 );
}
