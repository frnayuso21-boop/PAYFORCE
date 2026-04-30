"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
 Barcode, RefreshCw, CheckCircle, Copy, Share2,
 Download, Maximize2, X, QrCode as QrIcon,
} from "lucide-react";
import QRCode from "qrcode";

type Phase = "input"| "display"| "success";
type Format = "barcode"| "qr";

const KEYS = [
 ["1","2","3"],
 ["4","5","6"],
 ["7","8","9"],
 [".","0","⌫"],
];

function fmtCents(c: number) {
 return (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR"});
}

export default function BarcodeGeneratorPage() {
 const [phase, setPhase] = useState<Phase>("input");
 const [amount, setAmount] = useState("");
 const [concept, setConcept] = useState("");
 const [payUrl, setPayUrl] = useState("");
 const [linkToken, setLinkToken] = useState("");
 const [loading, setLoading] = useState(false);
 const [copied, setCopied] = useState(false);
 const [fullscreen, setFullscreen] = useState(false);
 const [format, setFormat] = useState<Format>("barcode");
 const [qrDataUrl, setQrDataUrl] = useState("");

 const canvasRef = useRef<HTMLCanvasElement>(null);
 const fsCanvasRef = useRef<HTMLCanvasElement>(null);
 const pollRef = useRef<NodeJS.Timeout | null>(null);

 const euros = parseFloat(amount || "0");
 const cents = Math.round(euros * 100);
 const canPay = cents >= 50;

 function pressKey(v: string) {
 if (v === "⌫") { setAmount((a) => a.slice(0, -1)); return; }
 if (v === "."&& amount.includes(".")) return;
 if (v === "."&& amount === "") { setAmount("0."); return; }
 const next = amount + v;
 if ((next.split(".")[1]?.length ?? 0) > 2) return;
 setAmount(next);
 }

 // Dibuja el barcode en un canvas usando JsBarcode (importado dinámicamente)
 async function drawBarcode(canvas: HTMLCanvasElement | null, url: string) {
 if (!canvas) return;
 const JsBarcode = (await import("jsbarcode")).default;
 JsBarcode(canvas, url, {
 format: "CODE128",
 lineColor: "#0f172a",
 background: "#ffffff",
 width: 2,
 height: 80,
 displayValue: false,
 margin: 16,
 });
 }

 async function drawQr(url: string) {
 const dataUrl = await QRCode.toDataURL(url, {
 width: 400, margin: 2,
 color: { dark: "#0f172a", light: "#ffffff"},
 errorCorrectionLevel: "M",
 });
 setQrDataUrl(dataUrl);
 }

 async function generate() {
 if (!canPay) return;
 setLoading(true);
 try {
 const r = await fetch("/api/payment-links", {
 method: "POST",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({
 amount: cents,
 currency: "eur",
 description: concept || "Cobro por código",
 }),
 });
 const d = await r.json();
 const url = d.url as string;
 const tok = d.token as string;
 setPayUrl(url);
 setLinkToken(tok);
 setPhase("display");
 // Dibuja en el siguiente tick (canvas tiene que estar montado)
 setTimeout(() => {
 if (format === "barcode") drawBarcode(canvasRef.current, url);
 else drawQr(url);
 }, 50);
 } finally {
 setLoading(false);
 }
 }

 // Re-dibuja cuando cambia el formato
 useEffect(() => {
 if (phase !== "display"|| !payUrl) return;
 if (format === "barcode") { drawBarcode(canvasRef.current, payUrl); setQrDataUrl(""); }
 else drawQr(payUrl);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [format, phase]);

 // Dibuja en el canvas fullscreen cuando se abre
 useEffect(() => {
 if (!fullscreen || !payUrl || format !== "barcode") return;
 setTimeout(() => drawBarcode(fsCanvasRef.current, payUrl), 50);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [fullscreen]);

 // Polling de pago
 const poll = useCallback(async () => {
 if (!linkToken) return;
 try {
 const r = await fetch(`/api/payment-links/${linkToken}/status`);
 if (!r.ok) return;
 const d = await r.json();
 if (d.status === "paid") {
 if (pollRef.current) clearInterval(pollRef.current);
 setPhase("success");
 }
 } catch { /* transient */ }
 }, [linkToken]);

 useEffect(() => {
 if (phase !== "display"|| !linkToken) return;
 pollRef.current = setInterval(poll, 3000);
 return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, [phase, linkToken, poll]);

 async function copy() {
 try { await navigator.clipboard.writeText(payUrl); }
 catch { /* fallback */ }
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }

 async function share() {
 if (navigator.share) {
 try { await navigator.share({ title: "Código de pago", url: payUrl }); return; }
 catch { /* cancelled */ }
 }
 copy();
 }

 function downloadCode() {
 if (format === "barcode"&& canvasRef.current) {
 const a = document.createElement("a");
 a.href = canvasRef.current.toDataURL("image/png");
 a.download = `barcode-${cents}cts.png`;
 a.click();
 } else if (qrDataUrl) {
 const a = document.createElement("a");
 a.href = qrDataUrl;
 a.download = `qr-${cents}cts.png`;
 a.click();
 }
 }

 function reset() {
 setPhase("input");
 setAmount("");
 setConcept("");
 setPayUrl("");
 setLinkToken("");
 setQrDataUrl("");
 setFullscreen(false);
 if (pollRef.current) clearInterval(pollRef.current);
 }

 /* ÉXITO */
 if (phase === "success") return (
 <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fb] p-8 text-center">
 <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 mb-6">
 <CheckCircle className="h-12 w-12 text-emerald-500"strokeWidth={1.5} />
 </div>
 <p className="text-[32px] font-bold text-slate-900">{fmtCents(cents)}</p>
 <p className="text-[18px] font-semibold text-emerald-600 mt-1">¡Pago recibido!</p>
 {concept && <p className="text-[13px] text-slate-400 mt-1">{concept}</p>}
 <button onClick={reset}
 className="mt-8 rounded-2xl bg-slate-900 px-8 py-3.5 text-[14px] font-bold text-white hover:bg-slate-700 transition">
 Nuevo cobro
 </button>
 </div>
 );

 /* MOSTRAR CÓDIGO */
 if (phase === "display") return (
 <>
 <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fb] p-8">
 <div className="w-full max-w-[420px]">
 {/* Header */}
 <div className="mb-5 text-center">
 <p className="text-[13px] text-slate-400 mb-0.5">Muestra este código para cobrar</p>
 <p className="text-[28px] font-bold text-slate-900">{fmtCents(cents)}</p>
 {concept && <p className="text-[13px] text-slate-500 mt-0.5">{concept}</p>}
 </div>

 {/* Toggle formato */}
 <div className="flex rounded-xl bg-slate-200 p-1 mb-4">
 <button onClick={() => setFormat("barcode")}
 className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition ${
 format === "barcode"? "bg-white shadow-sm text-slate-900": "text-slate-500"}`}>
 <Barcode className="h-4 w-4"/> Código de Barras
 </button>
 <button onClick={() => setFormat("qr")}
 className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition ${
 format === "qr"? "bg-white shadow-sm text-slate-900": "text-slate-500"}`}>
 <QrIcon className="h-4 w-4"/> QR
 </button>
 </div>

 {/* Código */}
 <div className="relative rounded-3xl bg-white p-6 shadow-lg border border-slate-200 mb-5 flex flex-col items-center">
 {format === "barcode"? (
 <>
 <canvas ref={canvasRef} className="w-full max-w-[360px] rounded-xl"/>
 <p className="mt-2 font-mono text-[10px] text-slate-400 break-all text-center max-w-[360px]">
 {payUrl}
 </p>
 </>
 ) : (
 qrDataUrl && <img src={qrDataUrl} alt="QR"className="w-full max-w-[280px] rounded-2xl"/>
 )}

 <button onClick={() => setFullscreen(true)}
 className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition">
 <Maximize2 className="h-4 w-4 text-slate-500"/>
 </button>

 <div className="mt-4 flex items-center gap-2">
 <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"/>
 <span className="text-[12px] text-slate-400">Esperando pago…</span>
 </div>
 </div>

 {/* Acciones */}
 <div className="grid grid-cols-3 gap-2.5 mb-3">
 <button onClick={copy}
 className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-semibold transition ${
 copied ? "bg-emerald-100 text-emerald-700": "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
 {copied ? <CheckCircle className="h-5 w-5"/> : <Copy className="h-5 w-5"/>}
 {copied ? "Copiado": "Copiar link"}
 </button>
 <button onClick={share}
 className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-slate-200 py-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
 <Share2 className="h-5 w-5"/>
 Compartir
 </button>
 <button onClick={downloadCode}
 className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-slate-200 py-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
 <Download className="h-5 w-5"/>
 Descargar
 </button>
 </div>

 <button onClick={reset}
 className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] text-slate-400 hover:bg-slate-50 transition">
 Cancelar y nuevo cobro
 </button>
 </div>
 </div>

 {/* Pantalla completa */}
 {fullscreen && (
 <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-8">
 <button onClick={() => setFullscreen(false)}
 className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition">
 <X className="h-5 w-5 text-slate-600"/>
 </button>
 <p className="text-[14px] text-slate-400 mb-1">Escanea para pagar</p>
 <p className="text-[36px] font-bold text-slate-900 mb-6">{fmtCents(cents)}</p>

 {format === "barcode"? (
 <canvas ref={fsCanvasRef} className="w-full max-w-[500px] rounded-2xl border border-slate-100"/>
 ) : (
 qrDataUrl && <img src={qrDataUrl} alt="QR"className="w-[80vmin] max-w-[420px] rounded-2xl"/>
 )}

 {concept && <p className="mt-5 text-[15px] text-slate-400">{concept}</p>}
 <div className="mt-5 flex items-center gap-2">
 <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"/>
 <span className="text-[13px] text-slate-400">Esperando confirmación de pago…</span>
 </div>
 </div>
 )}
 </>
 );

 /* INTRODUCIR IMPORTE */
 return (
 <div className="min-h-screen bg-[#f8f9fb] p-8">
 <div className="mb-7">
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <Barcode className="h-5 w-5 text-slate-400"/> Cobro por Código
 </h1>
 <p className="text-[13px] text-slate-400 mt-0.5">Genera un código de barras o QR — muéstralo o envíalo para cobrar</p>
 </div>

 {/* Toggle inicial */}
 <div className="flex rounded-xl bg-slate-200 p-1 mb-6 max-w-xs">
 <button onClick={() => setFormat("barcode")}
 className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition ${
 format === "barcode"? "bg-white shadow-sm text-slate-900": "text-slate-500"}`}>
 <Barcode className="h-4 w-4"/> Barras
 </button>
 <button onClick={() => setFormat("qr")}
 className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition ${
 format === "qr"? "bg-white shadow-sm text-slate-900": "text-slate-500"}`}>
 <QrIcon className="h-4 w-4"/> QR
 </button>
 </div>

 <div className="mx-auto max-w-[320px]">
 {/* Display importe */}
 <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center mb-3 shadow-sm">
 <p className="text-[12px] text-slate-400 mb-1 uppercase tracking-wide">Importe a cobrar</p>
 <p className="text-[44px] font-bold text-slate-900 leading-none min-h-[52px]">
 {amount
 ? `${amount} €`: <span className="text-slate-200">0,00 €</span>}
 </p>
 </div>

 {/* Concepto */}
 <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 mb-4 shadow-sm">
 <input value={concept} onChange={(e) => setConcept(e.target.value)}
 placeholder="Concepto (opcional)"className="w-full text-[13px] outline-none placeholder:text-slate-300 text-slate-800"/>
 </div>

 {/* Teclado */}
 <div className="grid grid-cols-3 gap-2 mb-4">
 {KEYS.flat().map((v) => (
 <button key={v} onClick={() => pressKey(v)}
 className="flex h-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-[18px] font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
 {v}
 </button>
 ))}
 </div>

 <button onClick={generate} disabled={loading || !canPay}
 className="w-full rounded-2xl bg-slate-900 py-4 text-[15px] font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-2">
 {loading
 ? <><RefreshCw className="h-5 w-5 animate-spin"/> Generando…</>
 : format === "barcode"? <><Barcode className="h-5 w-5"/> Generar código de barras</>
 : <><QrIcon className="h-5 w-5"/> Generar QR</>}
 </button>
 </div>
 </div>
 );
}
