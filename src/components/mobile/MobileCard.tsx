import { cn } from "@/lib/utils";

interface MobileCardProps {
 children: React.ReactNode;
 className?: string;
 padding?: boolean;
}

export function MobileCard({ children, className, padding = true }: MobileCardProps) {
 return (
 <div className={cn(
 "w-full rounded-2xl border border-slate-100 bg-white",
 padding && "p-4",
 className,
 )}>
 {children}
 </div>
 );
}

interface MetricRowProps {
 label: string;
 value: string;
 sub?: string;
 trend?: number | null;
}

export function MetricRow({ label, value, sub, trend }: MetricRowProps) {
 return (
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0 flex-1">
 <p className="text-[13px] text-slate-500 leading-tight">{label}</p>
 <p className="mt-0.5 text-[26px] font-normal tracking-tight text-slate-900 leading-none">
 {value}
 </p>
 {sub && <p className="mt-1 text-[12px] text-slate-400">{sub}</p>}
 </div>
 {trend !== undefined && trend !== null && (
 <span className={cn(
 "mt-1 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
 trend >= 0 ? "bg-emerald-50 text-emerald-700": "bg-red-50 text-red-600",
 )}>
 {trend >= 0 ? "+": ""}{trend.toFixed(1)}%
 </span>
 )}
 </div>
 );
}
