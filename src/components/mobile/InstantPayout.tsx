"use client";

import { useState, useEffect } from "react";
import { Zap, X, Loader2, CheckCircle2, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstantData {
 availableCents: number;
 feeCents: number;
 netCents: number;
 feeRate: number;
 currency: string;
 iban?: string;
 accountHolder?: string;
 history: Array<{
 id: string; requestedAmount: number; fee: number; netAmount: number;
 status: string; createdAt: string; processedAt?: string | null;
 }>;
}

function fmt(cents: number, currency = "eur") {
 return (cents / 100).toLocaleString("es-ES", {
 style: "currency", currency: currency.toUpperCase(),
 minimumFractionDigits: 2,
 });
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
 PENDING: { label: "Solicitado", color: "text-amber-600 bg-amber-50 border-amber-200"},
 PROCESSING: { label: "En proceso", color: "text-blue-600 bg-blue-50 border-blue-200"},
 COMPLETED: { label: "Completado", color: "text-emerald-600 bg-emerald-50 border-emerald-200"},
 FAILED: { label: "Fallido", color: "text-red-600 bg-red-50 border-red-200"},
};

export function InstantPayoutButton() {
 const [open, setOpen] = useState(false);
 const [data, setData] = useState<InstantData | null>(null);
 const [loading, setLoading] = useState(false);
 const [sending, setSending] = useState(false);
 const [success, setSuccess] = useState("");
 const [error, setError] = useState("");
 const [step, setStep] = useState<"info"| "confirm"| "done">("info");
 const [partial, setPartial] = useState(""); // importe parcial opcional

 async function loadData() {
 setLoading(true);
 try {
 const res = await fetch("/api/payouts/instant");
 const json = await res.json();
 setData(json);
 } catch { setError("Error al cargar el saldo"); }
 finally { setLoading(false); }
 }

 useEffect(() => { if (open) loadData(); }, [open]);

 async function handleRequest() {
 if (!data) return;
 setSending(true); setError("");
 try {
 const amountCents = partial
 ? Math.round(Number(partial) * 100)
 : undefined; // undefined = total disponible

 const res = await fetch("/api/payouts/instant", {
 method: "POST", headers: { "Content-Type": "application/json"},
 body: JSON.stringify({ amount: amountCents }),
 });
 const json = await res.json();
 if (!res.ok) throw new Error(json.error);
 setSuccess(json.message);
 setStep("done");
 loadData();
 } catch (e) {
 setError(e instanceof Error ? e.message : "Error al solicitar pago");
 } finally {
 setSending(false);
 }
 }

 // Calcular fees si el merchant pide un importe parcial
 const requestedCents = partial
 ? Math.min(Math.round(Number(partial) * 100), data?.availableCents ?? 0)
 : (data?.availableCents ?? 0);
 const displayFee = Math.ceil(requestedCents * (data?.feeRate ?? 0.015));
 const displayNet = requestedCents - displayFee;

 const maskedIban = data?.iban
 ? data.iban.slice(0, 4) + "•••• •••• "+ data.iban.slice(-4)
 : "IBAN no configurado";

 return (
 <>
 {/* Botón principal */}
 <button
 onClick={() => { setOpen(true); setStep("info"); setSuccess(""); setError(""); setPartial(""); }}
 className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 shadow-lg active:scale-[0.98] transition-all">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/25">
 <Zap className="h-5 w-5 text-white"fill="white"/>
 </div>
 <div className="text-left">
 <p className="text-[15px] font-normal text-white leading-tight">Pago inmediato</p>
 <p className="text-[11px] text-white/70 mt-0.5">Recibe tu dinero en minutos · +1,5%</p>
 </div>
 </div>
 <ChevronRight className="h-5 w-5 text-white/70"/>
 </button>

 {/* Bottom sheet */}
 {open && (
 <>
 <div className="fixed inset-0 z-[80] bg-black/50"onClick={() => setOpen(false)} />
 <div className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl bg-white shadow-2xl"style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)"}}>
 <div className="px-4 pt-4">
 <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-200"/>

 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
 <Zap className="h-5 w-5 text-amber-500"fill="currentColor"/>
 </div>
 <div>
 <p className="text-[16px] font-normal text-slate-900">Pago inmediato</p>
 <p className="text-[11px] text-slate-400">Comisión adicional 1,5%</p>
 </div>
 </div>
 <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
 <X className="h-4 w-4 text-slate-500"/>
 </button>
 </div>

 {loading && (
 <div className="flex justify-center py-10">
 <Loader2 className="h-7 w-7 animate-spin text-slate-300"/>
 </div>
 )}

 {/* FASE: info + confirmar */}
 {!loading && data && step !== "done"&& (
 <div className="space-y-3 pb-4">

 {/* Saldo disponible */}
 <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
 <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
 Saldo disponible para retirar
 </p>
 <p className="text-[38px] font-normal text-slate-900 tabular-nums leading-none">
 {fmt(data.availableCents, data.currency)}
 </p>
 {data.availableCents === 0 && (
 <p className="mt-2 text-[12px] text-slate-400">
 No tienes pagos pendientes de liquidar en este momento.
 </p>
 )}
 </div>

 {data.availableCents > 0 && (
 <>
 {/* Importe parcial */}
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
 Importe a retirar (deja vacío para el total)
 </p>
 <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
 <span className="text-slate-400 font-semibold">€</span>
 <input type="number"step="0.01"min="1"max={data.availableCents / 100}
 placeholder={`${(data.availableCents / 100).toFixed(2)} (total)`}
 value={partial} onChange={(e) => setPartial(e.target.value)}
 className="flex-1 bg-transparent text-[16px] font-semibold text-slate-900 placeholder:text-slate-300 outline-none"/>
 </div>
 </div>

 {/* Desglose de fees */}
 <div className="rounded-2xl border border-slate-200 overflow-hidden">
 <div className="flex justify-between px-4 py-3 bg-white">
 <span className="text-[13px] text-slate-500">Importe solicitado</span>
 <span className="text-[13px] font-semibold text-slate-900">{fmt(requestedCents, data.currency)}</span>
 </div>
 <div className="flex justify-between px-4 py-3 bg-amber-50 border-t border-amber-100">
 <span className="text-[13px] text-amber-700 flex items-center gap-1.5">
 <Zap className="h-3.5 w-3.5"fill="currentColor"/>
 Comisión instant (1,5%)
 </span>
 <span className="text-[13px] font-semibold text-amber-700">− {fmt(displayFee, data.currency)}</span>
 </div>
 <div className="flex justify-between px-4 py-3.5 bg-emerald-50 border-t border-emerald-100">
 <span className="text-[14px] font-normal text-emerald-700">Recibirás</span>
 <span className="text-[18px] font-normal text-emerald-700">{fmt(displayNet, data.currency)}</span>
 </div>
 </div>

 {/* Destino */}
 <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200">
 <span className="text-[10px] font-bold text-slate-500">ES</span>
 </div>
 <div>
 <p className="text-[12px] text-slate-400">Cuenta de destino</p>
 <p className="text-[13px] font-semibold text-slate-700 font-mono">{maskedIban}</p>
 {data.accountHolder && <p className="text-[11px] text-slate-400">{data.accountHolder}</p>}
 </div>
 </div>

 {!data.iban && (
 <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
 <AlertCircle className="h-4 w-4 text-red-500 shrink-0"/>
 <p className="text-[12px] text-red-600">Configura tu IBAN en Ajustes → Cuenta bancaria antes de solicitar un pago.</p>
 </div>
 )}

 {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

 {/* Aviso tiempo */}
 <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5">
 <Clock className="h-4 w-4 text-blue-400 shrink-0"/>
 <p className="text-[11px] text-blue-600">
 El dinero llega en <strong>5–30 minutos</strong> vía SEPA Instant. Disponible 24/7.
 </p>
 </div>

 <button
 onClick={handleRequest}
 disabled={sending || !data.iban || displayNet <= 0}
 className="w-full h-[54px] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[16px] font-normal disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2.5">
 {sending
 ? <Loader2 className="h-5 w-5 animate-spin"/>
 : <><Zap className="h-5 w-5"fill="white"/> Solicitar {fmt(displayNet, data.currency)} ahora</>
 }
 </button>
 </>
 )}

 {/* Historial */}
 {data.history.length > 0 && (
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2 mt-1">
 Solicitudes recientes
 </p>
 <div className="space-y-1.5">
 {data.history.map((h) => {
 const cfg = STATUS_CFG[h.status] ?? { label: h.status, color: "text-slate-500 bg-slate-50 border-slate-200"};
 return (
 <div key={h.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
 <div>
 <p className="text-[13px] font-semibold text-slate-900">{fmt(h.netAmount)}</p>
 <p className="text-[10px] text-slate-400">
 {new Date(h.createdAt).toLocaleDateString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"})}
 {"· "}comisión {fmt(h.fee)}
 </p>
 </div>
 <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", cfg.color)}>
 {cfg.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 )}

 {/* FASE: éxito */}
 {step === "done"&& (
 <div className="flex flex-col items-center py-8 gap-5 text-center pb-6">
 <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
 <CheckCircle2 className="h-10 w-10 text-emerald-500"strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-[22px] font-bold text-slate-900">¡Solicitado!</p>
 <p className="mt-2 text-[14px] text-slate-500 max-w-[260px] mx-auto">{success}</p>
 </div>
 <button
 onClick={() => setOpen(false)}
 className="w-full max-w-xs h-[50px] rounded-2xl bg-slate-900 text-white font-bold text-[15px]">
 Cerrar
 </button>
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </>
 );
}
