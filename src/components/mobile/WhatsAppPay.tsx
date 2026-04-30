"use client";

import { useState } from "react";
import { X, Loader2, Delete, CheckCircle2, ChevronLeft, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1","2","3","4","5","6","7","8","9",".", "0","⌫"];

const COUNTRY_CODES = [
 { flag: "", code: "34", label: "ES"},
 { flag: "", code: "52", label: "MX"},
 { flag: "", code: "54", label: "AR"},
 { flag: "", code: "57", label: "CO"},
 { flag: "", code: "1", label: "US"},
 { flag: "", code: "44", label: "GB"},
 { flag: "", code: "49", label: "DE"},
 { flag: "", code: "33", label: "FR"},
 { flag: "", code: "39", label: "IT"},
 { flag: "", code: "351", label: "PT"},
];

function formatDisplay(raw: string): string {
 if (!raw || raw === "0") return "0,00";
 const digits = raw.replace(".", "");
 const num = parseInt(digits, 10) / 100;
 return num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function rawToEuros(raw: string) { return parseInt((raw || "0").replace(".", ""), 10) / 100; }
function rawToCents(raw: string) { return Math.round(rawToEuros(raw) * 100); }

interface Props { onClose: () => void }

type Step = "amount"| "contact"| "sent";

export function WhatsAppPay({ onClose }: Props) {
 const [step, setStep] = useState<Step>("amount");
 const [raw, setRaw] = useState("000");
 const [description, setDescription] = useState("");
 const [phone, setPhone] = useState("");
 const [customerName,setCustomerName]= useState("");
 const [countryCode, setCountryCode] = useState("34");
 const [showCC, setShowCC] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [payUrl, setPayUrl] = useState("");

 function handleKey(k: string) {
 if (k === "⌫") { setRaw((p) => p.length <= 1 ? "0": p.slice(0, -1)); return; }
 if (k === ".") return;
 setRaw((p) => { const n = p === "0"? k : p + k; return n.length > 8 ? p : n; });
 }

 function goToContact() {
 if (rawToCents(raw) < 50) { setError("Importe mínimo 0,50 €"); return; }
 setError("");
 setStep("contact");
 }

 async function sendPayment() {
 setError("");
 setLoading(true);
 try {
 const cents = rawToCents(raw);
 const res = await fetch("/api/payment-links", {
 method: "POST",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({
 amount: cents,
 currency: "eur",
 description: description || "Cobro PayForce",
 customerName: customerName || undefined,
 maxUses: 1,
 metadata: { source: "whatsapp", customerPhone: phone ? `+${countryCode}${phone.replace(/\D/g, "")}`: ""},
 }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error ?? "Error al crear el cobro");

 const url = data.url as string;
 setPayUrl(url);

 // Construir mensaje persuasivo para el cliente
 const amountStr = `€${formatDisplay(raw)}`;
 const conceptPart = description ? `por *"${description}"*`: "";
 const namePart = customerName ? `Hola ${customerName} `: "Hola ";
 const msg = encodeURIComponent(
 `${namePart}\n\nTe solicito un pago${conceptPart} de *${amountStr}*.\n\n`+
 `Pulsa el enlace para pagar de forma rápida y segura con tu tarjeta o Apple Pay:\n\n`+
 `${url}\n\n`+
 `_Pago procesado por PayForce · Seguro y cifrado_`);

 // Número con código de país (sin espacios ni caracteres no numéricos)
 const cleanPhone = phone.replace(/\D/g, "");
 const fullPhone = cleanPhone ? `${countryCode}${cleanPhone}`: "";
 const waUrl = fullPhone
 ? `https://wa.me/${fullPhone}?text=${msg}`: `https://wa.me/?text=${msg}`;

 window.open(waUrl, "_blank");
 setStep("sent");
 } catch (e) {
 setError(e instanceof Error ? e.message : "Error desconocido");
 } finally {
 setLoading(false);
 }
 }

 // PASO 1: IMPORTE 
 if (step === "amount") return (
 <BottomSheet onClose={onClose} title="Cobrar por WhatsApp">
 <div className="flex flex-col items-center pt-1 pb-2">
 <div className="flex items-baseline gap-1 mb-3">
 <span className="text-[20px] text-slate-400 mt-2">€</span>
 <span className={cn(
 "text-[54px] font-bold tabular-nums leading-none",
 rawToEuros(raw) === 0 ? "text-slate-200": "text-slate-900")}>
 {formatDisplay(raw)}
 </span>
 </div>
 <input
 type="text"placeholder="Concepto (ej: cena del viernes)"value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="w-64 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-[14px] text-slate-700 placeholder:text-slate-400 outline-none"maxLength={60}
 />
 {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
 </div>

 <div className="grid grid-cols-3 gap-2 mb-3">
 {KEYS.map((k) => (
 <button key={k} onClick={() => handleKey(k)}
 className={cn(
 "flex h-[60px] items-center justify-center rounded-2xl text-[24px] font-medium transition-all active:scale-95",
 k === "⌫"? "bg-slate-100 text-slate-400": "bg-slate-100 text-slate-900 active:bg-slate-200")}>
 {k === "⌫"? <Delete className="h-5 w-5"/> : k}
 </button>
 ))}
 </div>

 <button onClick={goToContact}
 disabled={rawToCents(raw) < 50}
 className="w-full h-[54px] rounded-2xl bg-[#25D366] text-white text-[16px] font-normal active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center gap-2.5">
 <WhatsAppIcon />
 Siguiente · €{formatDisplay(raw)}
 </button>
 </BottomSheet>
 );

 // PASO 2: CONTACTO 
 if (step === "contact") return (
 <BottomSheet onClose={onClose} title="¿A quién le cobras?">
 <div className="flex flex-col gap-4 pt-1 pb-2">
 {/* Resumen del cobro */}
 <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
 <div>
 <p className="text-[22px] font-bold text-slate-900">€{formatDisplay(raw)}</p>
 {description && <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>}
 </div>
 <button onClick={() => setStep("amount")}
 className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-700 transition">
 <ChevronLeft className="h-3.5 w-3.5"/> Cambiar
 </button>
 </div>

 {/* Nombre del cliente */}
 <div>
 <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
 Nombre del cliente <span className="font-normal normal-case">(opcional)</span>
 </label>
 <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
 <User className="h-4 w-4 text-slate-400 shrink-0"/>
 <input
 type="text"placeholder="Ej: María García"value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none"maxLength={50}
 />
 </div>
 <p className="mt-1 text-[10px] text-slate-400 px-1">
 Aparecerá en la ventana de pago del cliente
 </p>
 </div>

 {/* Teléfono */}
 <div>
 <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
 Número de WhatsApp <span className="font-normal normal-case">(opcional)</span>
 </label>
 <div className="flex items-center gap-2 rounded-2xl bg-slate-100 overflow-hidden">
 {/* País */}
 <div className="relative">
 <button onClick={() => setShowCC((v) => !v)}
 className="flex items-center gap-1.5 pl-4 pr-3 py-3.5 text-[15px] text-slate-700 border-r border-slate-200">
 {COUNTRY_CODES.find(c => c.code === countryCode)?.flag ?? ""}
 <span className="text-[12px] text-slate-500">+{countryCode}</span>
 </button>
 {showCC && (
 <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
 {COUNTRY_CODES.map((c) => (
 <button key={c.code} onClick={() => { setCountryCode(c.code); setShowCC(false); }}
 className={cn(
 "flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-slate-50 transition",
 countryCode === c.code && "bg-slate-100 font-semibold")}>
 <span>{c.flag}</span>
 <span className="text-slate-500">{c.label}</span>
 <span className="ml-auto text-slate-400">+{c.code}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 <div className="flex flex-1 items-center gap-2 pr-4">
 <Phone className="h-4 w-4 text-slate-400 shrink-0"/>
 <input
 type="tel"autoFocus
 placeholder="612 345 678"value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none py-3.5"maxLength={15}
 />
 </div>
 </div>
 <p className="mt-1.5 text-[10px] text-slate-400 px-1">
 Si lo dejas vacío podrás elegir el contacto directamente en WhatsApp
 </p>
 </div>

 {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

 <button onClick={sendPayment} disabled={loading}
 className="w-full h-[54px] rounded-2xl bg-[#25D366] text-white text-[16px] font-normal active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5">
 {loading
 ? <><Loader2 className="h-5 w-5 animate-spin"/> Preparando…</>
 : <><WhatsAppIcon /> Enviar solicitud de pago</>}
 </button>
 </div>
 </BottomSheet>
 );

 // PASO 3: ENVIADO 
 return (
 <BottomSheet onClose={onClose} title="">
 <div className="flex flex-col items-center gap-4 py-5 text-center">
 <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/15">
 <CheckCircle2 className="h-10 w-10 text-[#25D366]"strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-[24px] font-normal text-slate-900">¡Solicitud enviada!</p>
 {customerName && (
 <p className="mt-0.5 text-[14px] text-slate-400">
 {customerName} recibirá la solicitud en WhatsApp
 </p>
 )}
 </div>

 <div className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2">
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Importe</span>
 <span className="font-bold text-slate-900">€{formatDisplay(raw)}</span>
 </div>
 {description && (
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Concepto</span>
 <span className="text-slate-700">{description}</span>
 </div>
 )}
 {customerName && (
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Cliente</span>
 <span className="text-slate-700">{customerName}</span>
 </div>
 )}
 <div className="flex justify-between text-[13px]">
 <span className="text-slate-400">Estado</span>
 <span className="text-amber-500 font-semibold">Esperando pago</span>
 </div>
 </div>

 {payUrl && (
 <button
 onClick={() => { try { navigator.clipboard.writeText(payUrl); } catch {} }}
 className="w-full rounded-2xl border border-slate-200 py-2.5 text-[13px] text-slate-500 hover:bg-slate-50 transition">
 Copiar link de pago
 </button>
 )}

 <div className="flex w-full gap-2.5">
 <button
 onClick={() => { setStep("amount"); setRaw("000"); setDescription(""); setPhone(""); setCustomerName(""); setPayUrl(""); }}
 className="flex-1 h-[48px] rounded-2xl bg-slate-900 text-white text-[14px] font-semibold active:scale-[0.98]">
 Nuevo cobro
 </button>
 <button onClick={onClose}
 className="flex-1 h-[48px] rounded-2xl border border-slate-200 text-slate-600 text-[14px] font-semibold active:scale-[0.98]">
 Cerrar
 </button>
 </div>
 </div>
 </BottomSheet>
 );
}

/* Subcomponentes */

function WhatsAppIcon() {
 return (
 <svg width="20"height="20"viewBox="0 0 24 24"fill="white">
 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
 <path d="M12 0C5.373 0 0 5.373 0 12c0 2.139.565 4.147 1.549 5.887L.057 23.552a.5.5 0 0 0 .609.61l5.79-1.52A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.95 9.95 0 0 1-5.193-1.453l-.371-.221-3.845 1.01 1.02-3.733-.242-.384A9.948 9.948 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
 </svg>
 );
}

function BottomSheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
 return (
 <>
 <div className="fixed inset-0 z-[80] bg-black/40"onClick={onClose} />
 <div className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl bg-white px-4 pt-4 shadow-2xl"style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)"}}>
 <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-slate-200"/>
 <div className="flex items-center justify-between mb-4">
 {title ? <p className="text-[16px] font-normal text-slate-900">{title}</p> : <div />}
 <button onClick={onClose}
 className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
 <X className="h-4 w-4 text-slate-500"/>
 </button>
 </div>
 {children}
 </div>
 </>
 );
}
