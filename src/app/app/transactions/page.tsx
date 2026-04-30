"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { usePayments } from "@/hooks/useDashboard";
import Link from "next/link";
import {
 RefreshCw, Search, CheckCircle2, XCircle, Clock,
 RotateCcw, ChevronRight, X, AlertTriangle, Loader2,
 CreditCard, Download,
} from "lucide-react";

// Tipos 
type Payment = {
 id: string;
 amount: number;
 amountRefunded: number;
 currency: string;
 status: string;
 description: string | null;
 customerEmail: string | null;
 customerName: string | null;
 created: number;
 fee: number;
 net: number;
 refunded: boolean;
 paymentIntentId: string | null;
 paymentMethod?: { type: string; brand?: string; last4?: string } | null;
};
type FilterKey = "all"| "succeeded"| "failed"| "refunded";

// Helpers 
function fmt(cents: number, currency = "eur") {
 return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: currency.toUpperCase() });
}
function fmtDate(ts: number) {
 return new Date(ts * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric"});
}
function fmtTime(ts: number) {
 return new Date(ts * 1000).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit"});
}
function cardBrand(brand?: string) {
 const map: Record<string, string> = {
 visa: "Visa", mastercard: "Mastercard", amex: "Amex",
 discover: "Discover", unionpay: "UnionPay",
 };
 return map[brand?.toLowerCase() ?? ""] ?? (brand ?? "Tarjeta");
}

// Status badge 
const STATUS_CFG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
 succeeded: { label: "Exitoso", icon: <CheckCircle2 className="h-3 w-3"/>, bg: "#DCFCE7", text: "#15803D"},
 pending: { label: "Pendiente", icon: <Clock className="h-3 w-3"/>, bg: "#FEF9C3", text: "#A16207"},
 failed: { label: "Fallido", icon: <XCircle className="h-3 w-3"/>, bg: "#FEE2E2", text: "#991B1B"},
 refunded: { label: "Reembolsado", icon: <RotateCcw className="h-3 w-3"/>, bg: "#DBEAFE", text: "#1D4ED8"},
};
function StatusBadge({ status }: { status: string }) {
 const cfg = STATUS_CFG[status] ?? { label: status, icon: null, bg: "#F3F4F6", text: "#6B7280"};
 return (
 <span className="inline-flex items-center gap-1 rounded-[980px] px-2 py-0.5 text-[10px] font-medium"style={{ backgroundColor: cfg.bg, color: cfg.text }}>
 {cfg.icon}{cfg.label}
 </span>
 );
}

// Modal reembolso rápido 
const REFUND_REASONS = [
 { value: "requested_by_customer", label: "Solicitado por el cliente"},
 { value: "duplicate", label: "Duplicado"},
 { value: "fraudulent", label: "Fraude"},
];
function RefundModal({ payment, onClose, onSuccess }: {
 payment: Payment; onClose: () => void; onSuccess: (id: string) => void;
}) {
 const [reason, setReason] = useState("requested_by_customer");
 const [loading, setLoading] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");

 async function handleConfirm() {
 setErrorMsg(""); setLoading(true);
 try {
 const r = await fetch(`/api/dashboard/payments/${payment.id}/refund`, {
 method: "POST", headers: { "Content-Type": "application/json"},
 body: JSON.stringify({ reason }),
 });
 const d = await r.json();
 if (!r.ok) { setErrorMsg(d.error ?? "Error al reembolsar."); return; }
 onSuccess(payment.id); onClose();
 } catch {
 setErrorMsg("Error de red. Inténtalo de nuevo.");
 } finally { setLoading(false); }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
 <div className="w-full max-w-sm rounded-[12px] border border-[#E5E7EB] bg-white shadow-xl overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
 <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Reembolsar pago</h2>
 <button onClick={onClose} className="rounded-lg p-1 text-[#9CA3AF] hover:bg-[#F9FAFB] transition">
 <X className="h-4 w-4"/>
 </button>
 </div>
 <div className="px-5 py-4 space-y-4">
 <div className="rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
 <p className="text-[11px] text-[#9CA3AF]">{payment.description ?? payment.id}</p>
 <p className="text-[15px] font-semibold text-[#0A0A0A]">
 {fmt(payment.amount, payment.currency)}
 {payment.customerEmail && <span className="ml-1.5 text-[13px] font-normal text-[#9CA3AF]">· {payment.customerEmail}</span>}
 </p>
 </div>
 <div className="space-y-1.5">
 <p className="text-[11px] font-medium text-[#6B7280]">Motivo</p>
 <select value={reason} onChange={(e) => setReason(e.target.value)}
 className="w-full rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-[#0A0A0A] outline-none">
 {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
 </select>
 </div>
 <div className="flex items-start gap-2 rounded-[8px] bg-amber-50 border border-amber-100 px-3 py-2.5">
 <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5"/>
 <p className="text-[11px] text-amber-700">Las comisiones no son reembolsables. Solo se devuelve el importe neto al cliente.</p>
 </div>
 {errorMsg && (
 <div className="flex items-center gap-2 rounded-[8px] bg-red-50 border border-red-100 px-3 py-2.5">
 <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0"/>
 <p className="text-[11px] text-red-700">{errorMsg}</p>
 </div>
 )}
 </div>
 <div className="flex justify-end gap-2 px-5 pb-5">
 <button onClick={onClose} disabled={loading}
 className="rounded-[8px] border border-[#E5E7EB] px-4 py-2 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition disabled:opacity-50">
 Cancelar
 </button>
 <button onClick={handleConfirm} disabled={loading}
 className="flex items-center gap-1.5 rounded-[8px] bg-[#991B1B] px-4 py-2 text-[12px] font-medium text-white hover:bg-red-800 transition disabled:opacity-60">
 {loading && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}
 Confirmar reembolso
 </button>
 </div>
 </div>
 </div>
 );
}

// Skeleton row 
function SkRow() {
 return (
 <div className="grid items-center px-5 py-3.5 border-b border-[#F3F4F6]"style={{ gridTemplateColumns: "1.4fr 1fr 1.8fr 1.6fr 1.2fr 1fr 1fr 90px 20px"}}>
 {[28, 16, 32, 24, 20, 14, 14, 0, 0].map((w, i) => (
 w ? <div key={i} className={`h-3.5 w-${w} animate-pulse rounded-[4px] bg-[#F3F4F6] ${i >= 5 ? "ml-auto": ""}`} />
 : <div key={i} />
 ))}
 </div>
 );
}

const FILTERS: { key: FilterKey; label: string }[] = [
 { key: "all", label: "Todos"},
 { key: "succeeded", label: "Exitosos"},
 { key: "failed", label: "Fallidos"},
 { key: "refunded", label: "Reembolsados"},
];

// 
export default function TransactionsPage() {
 const [filter, setFilter] = useState<FilterKey>("all");
 const [search, setSearch] = useState("");
 const [refundTarget, setRefundTarget] = useState<Payment | null>(null);

 const swrKey = `/api/dashboard/payments?limit=200&status=${filter}`;
 const { data, isLoading: loading } = usePayments(filter, 200);
 const payments: Payment[] = data?.payments ?? [];

 const visible = payments.filter((p) => {
 if (!search) return true;
 const q = search.toLowerCase();
 return (
 p.id.toLowerCase().includes(q) ||
 (p.description ?? "").toLowerCase().includes(q) ||
 (p.customerEmail ?? "").toLowerCase().includes(q) ||
 (p.customerName ?? "").toLowerCase().includes(q) ||
 (p.paymentIntentId ?? "").toLowerCase().includes(q)
 );
 });

 const totalBruto = visible.filter(p => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
 const totalNeto = visible.filter(p => p.status === "succeeded").reduce((s, p) => s + p.net, 0);
 const totalFees = visible.filter(p => p.status === "succeeded").reduce((s, p) => s + p.fee, 0);

 function handleRefundSuccess(_id: string) {
 void swrMutate(swrKey);
 }

 return (
 <div className="min-h-full bg-[#F9FAFB] p-6 lg:p-8">

 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-[20px] font-semibold tracking-tight text-[#0A0A0A]">Transacciones</h1>
 <p className="text-[12px] text-[#9CA3AF] mt-0.5">Historial completo de cobros y movimientos</p>
 </div>
 <button onClick={() => void swrMutate(swrKey)}
 className="flex items-center gap-1.5 rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] text-[#6B7280] hover:bg-[#F9FAFB] transition">
 <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin": ""}`} /> Actualizar
 </button>
 </div>

 {/* KPI rápidos */}
 {!loading && visible.length > 0 && (
 <div className="grid grid-cols-3 gap-3 mb-5">
 {[
 { label: "VOLUMEN BRUTO", value: fmt(totalBruto) },
 { label: "NETO RECIBIDO", value: fmt(totalNeto) },
 { label: "COMISIONES", value: fmt(totalFees) },
 ].map((c) => (
 <div key={c.label} className="rounded-[10px] border border-[#E5E7EB] bg-white px-5 py-4">
 <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-1">{c.label}</p>
 <p className="text-[22px] font-semibold tracking-tight text-[#0A0A0A]">{c.value}</p>
 </div>
 ))}
 </div>
 )}

 {/* Filtros + búsqueda */}
 <div className="flex items-center gap-3 mb-4 flex-wrap">
 <div className="flex items-center gap-1 rounded-[8px] border border-[#E5E7EB] bg-white p-1">
 {FILTERS.map((f) => (
 <button key={f.key} onClick={() => setFilter(f.key)}
 className="rounded-[6px] px-3 py-1.5 text-[11px] font-medium transition"style={{ background: filter === f.key ? "#0A0A0A": "transparent", color: filter === f.key ? "#fff": "#6B7280"}}>
 {f.label}
 </button>
 ))}
 </div>
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF] pointer-events-none"/>
 <input value={search} onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar por cliente, descripción, ID…"className="w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-9 pr-4 py-2 text-[12px] text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] transition"/>
 </div>
 {visible.length > 0 && (
 <span className="ml-auto text-[11px] text-[#9CA3AF]">
 {visible.length} transacción{visible.length !== 1 ? "es": ""}
 </span>
 )}
 </div>

 {/* Tabla */}
 <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">
 {/* Cabecera */}
 <div className="grid border-b border-[#E5E7EB] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]"style={{ gridTemplateColumns: "1.4fr 1fr 1.8fr 1.6fr 1.2fr 1fr 1fr 90px 20px"}}>
 <span>Importe</span>
 <span>Estado</span>
 <span>Descripción</span>
 <span>Cliente</span>
 <span>Fecha y hora</span>
 <span className="text-right">Comisión</span>
 <span className="text-right">Neto</span>
 <span />
 <span />
 </div>

 {loading ? (
 <div>{[...Array(8)].map((_, i) => <SkRow key={i} />)}</div>
 ) : visible.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 gap-2">
 <CreditCard className="h-8 w-8 text-[#E5E7EB]"/>
 <p className="text-[13px] text-[#9CA3AF]">Sin transacciones</p>
 </div>
 ) : (
 <div className="divide-y divide-[#F3F4F6]">
 {visible.map((p) => (
 <div key={p.id}
 className="grid items-center px-5 py-3 hover:bg-[#F9FAFB] transition group"style={{ gridTemplateColumns: "1.4fr 1fr 1.8fr 1.6fr 1.2fr 1fr 1fr 90px 20px"}}>

 {/* Importe + método */}
 <Link href={`/app/payments/${p.id}`} className="block min-w-0 pr-2">
 <p className="text-[13px] font-semibold tabular-nums"style={{ color: p.status === "succeeded"? "#0A0A0A": p.status === "failed"? "#991B1B": "#6B7280"}}>
 {fmt(p.amount, p.currency)}
 </p>
 {p.paymentMethod?.last4 && (
 <p className="text-[10px] text-[#9CA3AF] mt-0.5">
 {cardBrand(p.paymentMethod.brand)} •••• {p.paymentMethod.last4}
 </p>
 )}
 {p.amountRefunded > 0 && (
 <p className="text-[10px] text-[#1D4ED8]">−{fmt(p.amountRefunded, p.currency)} devuelto</p>
 )}
 </Link>

 {/* Estado */}
 <Link href={`/app/payments/${p.id}`} className="block">
 <StatusBadge status={p.status} />
 </Link>

 {/* Descripción */}
 <Link href={`/app/payments/${p.id}`}
 className="text-[12px] text-[#6B7280] truncate pr-3 block">
 {p.description ?? "—"}
 </Link>

 {/* Cliente */}
 <Link href={`/app/payments/${p.id}`} className="min-w-0 block pr-3">
 {p.customerName
 ? <p className="text-[12px] font-medium text-[#0A0A0A] truncate">{p.customerName}</p>
 : null}
 {p.customerEmail
 ? <p className="text-[11px] text-[#9CA3AF] truncate">{p.customerEmail}</p>
 : null}
 {!p.customerName && !p.customerEmail
 ? <span className="text-[11px] font-mono text-[#9CA3AF]">{(p.paymentIntentId ?? p.id).slice(0, 18)}…</span>
 : null}
 </Link>

 {/* Fecha */}
 <Link href={`/app/payments/${p.id}`} className="block">
 <p className="text-[12px] text-[#0A0A0A]">{fmtDate(p.created)}</p>
 <p className="text-[11px] text-[#9CA3AF]">{fmtTime(p.created)}</p>
 </Link>

 {/* Comisión */}
 <Link href={`/app/payments/${p.id}`}
 className="text-[12px] text-[#9CA3AF] text-right tabular-nums block">
 {p.fee > 0 ? `−${fmt(p.fee, p.currency)}`: "—"}
 </Link>

 {/* Neto */}
 <Link href={`/app/payments/${p.id}`}
 className="text-[12px] font-medium text-[#0A0A0A] text-right tabular-nums block">
 {p.net > 0 ? fmt(p.net, p.currency) : "—"}
 </Link>

 {/* Reembolsar / Factura */}
 <div className="flex items-center justify-center gap-2">
 {p.status === "succeeded"&& !p.refunded && (
 <button onClick={(e) => { e.stopPropagation(); setRefundTarget(p); }}
 className="rounded-[5px] border border-[#FECACA] bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-medium text-[#991B1B] hover:bg-red-100 transition whitespace-nowrap">
 Reembolsar
 </button>
 )}
 {p.status === "succeeded"&& (
 <a href={`/api/invoices/${p.id}`} download title="Factura PDF"className="text-[#9CA3AF] hover:text-[#0A0A0A] transition">
 <Download className="h-3.5 w-3.5"/>
 </a>
 )}
 </div>

 {/* Flecha */}
 <Link href={`/app/payments/${p.id}`} className="contents">
 <ChevronRight className="h-4 w-4 text-[#E5E7EB] group-hover:text-[#9CA3AF] transition justify-self-end"/>
 </Link>
 </div>
 ))}
 </div>
 )}
 </div>

 {refundTarget && (
 <RefundModal payment={refundTarget} onClose={() => setRefundTarget(null)} onSuccess={handleRefundSuccess} />
 )}
 </div>
 );
}
