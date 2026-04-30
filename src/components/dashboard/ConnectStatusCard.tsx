import Link from "next/link";
import { CheckCircle2, AlertTriangle, Clock, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectAccount } from "@/types";

interface ConnectStatusCardProps {
 account: ConnectAccount;
}

const STATUS_CFG: Record<string, {
 icon: React.ReactNode;
 label: string;
 color: string;
 bg: string;
}> = {
 enabled: {
 icon: <CheckCircle2 className="h-4 w-4"/>,
 label: "Cuenta de cobros activa",
 color: "text-emerald-600",
 bg: "bg-emerald-50",
 },
 pending: {
 icon: <Clock className="h-4 w-4"/>,
 label: "Verificación pendiente",
 color: "text-amber-600",
 bg: "bg-amber-50",
 },
 restricted: {
 icon: <AlertTriangle className="h-4 w-4"/>,
 label: "Acción requerida para cobrar",
 color: "text-orange-600",
 bg: "bg-orange-50",
 },
 rejected: {
 icon: <XCircle className="h-4 w-4"/>,
 label: "Cuenta de cobros rechazada",
 color: "text-red-600",
 bg: "bg-red-50",
 },
 not_connected: {
 icon: <AlertTriangle className="h-4 w-4"/>,
 label: "Cobros no activados",
 color: "text-slate-500",
 bg: "bg-slate-100",
 },
};

function Capability({ label, enabled }: { label: string; enabled: boolean }) {
 return (
 <div className="flex items-center justify-between py-2">
 <span className="text-[12px] text-slate-500">{label}</span>
 <span className={cn(
 "text-[11px] font-semibold",
 enabled ? "text-emerald-600": "text-slate-400")}>
 {enabled ? "Activo": "Inactivo"}
 </span>
 </div>
 );
}

export function ConnectStatusCard({ account }: ConnectStatusCardProps) {
 const status = (account.status ?? "not_connected").toLowerCase();
 const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_connected;

 return (
 <div className="h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

 {/* Header */}
 <div className="flex items-start justify-between">
 <div>
 <h2 className="text-[13px] font-semibold text-slate-800">Cuenta de cobros</h2>
 {account.email && (
 <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[160px]">
 {account.email}
 </p>
 )}
 </div>
 <Link
 href="/app/connect"className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
 Gestionar cuenta
 </Link>
 </div>

 {/* Estado */}
 <div className={cn(
 "mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5",
 cfg.bg
 )}>
 <span className={cfg.color}>{cfg.icon}</span>
 <div>
 <p className={cn("text-[12px] font-semibold", cfg.color)}>{cfg.label}</p>
 <p className="text-[11px] text-slate-400">{account.businessName}</p>
 </div>
 </div>

 {/* Capacidades */}
 <div className="mt-4 divide-y divide-slate-50">
 <Capability label="Cobros habilitados"enabled={account.chargesEnabled} />
 <Capability label="Pagos habilitados"enabled={account.payoutsEnabled} />
 <Capability label="Identidad verificada"enabled={account.detailsSubmitted} />
 </div>

 {/* CTA si no está activo */}
 {status !== "enabled"&& (
 <Link
 href="/app/connect/onboarding"className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800">
 {status === "not_connected"? "Activar cobros": "Completar verificación"}
 <ArrowRight className="h-3 w-3"/>
 </Link>
 )}
 </div>
 );
}
