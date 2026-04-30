"use client";

import { useState, useEffect } from "react";
import { Loader2, Shield, Smartphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { HexLogo } from "@/components/icons/HexLogo";

interface Props {
 token: string;
 amount: number;
 currency: string;
 description?: string | null;
 businessName: string;
 payUrl: string;
}

type Stage = "idle"| "loading"| "done";
type AnimPhase = "hex"| "check"| "text";

export function TestPayCheckout({
 token, amount, currency, description, businessName,
}: Props) {
 const [stage, setStage] = useState<Stage>("idle");
 const [animPhase, setAnimPhase] = useState<AnimPhase>("hex");

 useEffect(() => {
 if (stage !== "done") return;
 const t1 = setTimeout(() => setAnimPhase("check"), 350);
 const t2 = setTimeout(() => setAnimPhase("text"), 950);
 return () => { clearTimeout(t1); clearTimeout(t2); };
 }, [stage]);

 async function simulatePay() {
 setStage("loading");
 try {
 await fetch(`/api/payment-links/${token}/test-pay`, { method: "POST"});
 } catch { /* silencioso */ }
 await new Promise((r) => setTimeout(r, 900));
 setAnimPhase("hex");
 setStage("done");
 }

 if (stage === "done") {
 return (
 <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">

 {/* Hexágono animado */}
 <div className="relative flex h-24 w-24 items-center justify-center">
 {animPhase === "text"&& (
 <span className="absolute inset-0 rounded-full"style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)", animation: "pulse 2s ease-in-out infinite"}} />
 )}
 <div style={{
 transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
 transform: animPhase === "hex"? "scale(0.5)": "scale(1)",
 opacity: animPhase === "hex"? 0 : 1,
 }}>
 <HexLogo size={96} className="text-emerald-500"/>
 </div>
 <svg viewBox="0 0 48 48"width={44} height={44} fill="none"className="absolute inset-0 m-auto"style={{ pointerEvents: "none"}}>
 <polyline points="10,26 20,36 38,16"stroke="white"strokeWidth="5"strokeLinecap="round"strokeLinejoin="round"fill="none"style={{
 strokeDasharray: 50,
 strokeDashoffset: animPhase === "check"|| animPhase === "text"? 0 : 50,
 transition: "stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1) 0.05s",
 }} />
 </svg>
 </div>

 {/* Textos */}
 <div style={{
 opacity: animPhase === "text"? 1 : 0,
 transform: animPhase === "text"? "translateY(0)": "translateY(8px)",
 transition: "opacity 0.4s ease, transform 0.4s ease",
 }}>
 <p className="text-[30px] font-extrabold tabular-nums text-slate-900 leading-tight">
 {formatCurrency(amount / 100, currency)}
 </p>
 <p className="text-[16px] font-semibold text-emerald-500 mt-0.5">¡Pago completado!</p>
 {description && <p className="text-[13px] text-slate-400 mt-1">{description}</p>}
 <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-700">
 Entorno de prueba · No se ha cobrado ningún importe real
 </div>
 </div>

 <style>{`@keyframes pulse {
 0%,100%{transform:scale(1);opacity:.6}
 50%{transform:scale(1.15);opacity:.2}
 }
 `}</style>
 </div>
 );
 }

 return (
 <div className="flex flex-col items-center gap-6 py-6">
 {/* Badge modo test */}
 <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"/>
 Modo prueba — sin cobro real
 </div>

 {/* Datos del pago */}
 <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-1.5">
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Comercio</span>
 <span className="font-semibold text-slate-800">{businessName}</span>
 </div>
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Importe</span>
 <span className="font-bold text-slate-900">{formatCurrency(amount / 100, currency)}</span>
 </div>
 {description && (
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Concepto</span>
 <span className="text-slate-700 max-w-[160px] text-right">{description}</span>
 </div>
 )}
 </div>

 {/* Botón simular pago */}
 <button
 onClick={simulatePay}
 disabled={stage === "loading"}
 className="w-full rounded-2xl bg-slate-900 py-4 text-[15px] font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
 {stage === "loading"? (
 <><Loader2 className="h-5 w-5 animate-spin"/> Procesando…</>
 ) : (
 <><Smartphone className="h-5 w-5"/> Simular pago completado</>
 )}
 </button>

 <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
 <Shield className="h-3.5 w-3.5 text-slate-300"/>
 Entorno de prueba · No se realizan cargos reales
 </div>
 </div>
 );
}
