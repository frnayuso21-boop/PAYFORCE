"use client";
import { useEffect, useRef, useState } from "react";

/* Configuración de la animación */

const CURL_COMMAND =
 `curl -X POST https://api.payforce.io/v1/payments \\
 -H "Authorization: Bearer pf_live_xK9m2..."\\
 -H "Content-Type: application/json"\\
 -d '{
 "amount": 34900,
 "currency": "eur",
 "method": "card",
 "customer": {
 "email": "maria@empresa.com",
 "name": "María García"},
 "description": "Suscripción Pro · Abril 2026"}'`;

const RESPONSE_LINES = [
 { text: "{", color: "#f8f8f2"},
 { text: ' "id": "pay_9Xk3mQwLp7fN2cR",', color: "#8be9fd"},
 { text: ' "status": "succeeded",', color: "#50fa7b"},
 { text: ' "amount": 34900,', color: "#bd93f9"},
 { text: ' "currency": "eur",', color: "#bd93f9"},
 { text: ' "method": "card",', color: "#bd93f9"},
 { text: ' "customer": {', color: "#f8f8f2"},
 { text: ' "email": "maria@empresa.com",', color: "#f1fa8c"},
 { text: ' "name": "María García"', color: "#f1fa8c"},
 { text: "},", color: "#f8f8f2"},
 { text: ' "titan_risk": 0.03,', color: "#ffb86c"},
 { text: ' "created_at": "2026-04-13T14:59:02Z",', color: "#6272a4"},
 { text: ' "fee": "4% + €0.40"', color: "#6272a4"},
 { text: "}", color: "#f8f8f2"},
];

interface LiveEvent {
 id: number;
 label: "PAGO"| "REEMBOLSO"| "FRAUDE";
 user: string;
 amount: string;
 ms: number;
 fresh: boolean;
}

const BASE_EVENTS: Omit<LiveEvent, "id"| "fresh">[] = [
 { label: "PAGO", user: "maria@empresa.com", amount: "€349,00", ms: 820 },
 { label: "PAGO", user: "j.lopez@pyme.es", amount: "€1.200,00", ms: 930 },
 { label: "REEMBOLSO", user: "shop@tienda.com", amount: "€49,00", ms: 1140 },
 { label: "PAGO", user: "admin@startup.io", amount: "€89,00", ms: 770 },
 { label: "PAGO", user: "info@clinic.es", amount: "€220,00", ms: 1010 },
 { label: "PAGO", user: "pay@hotel.es", amount: "€780,00", ms: 680 },
];

/* Hooks internos */

/** Devuelve un contador 0-max que sube de 1 en 1 cada `stepMs`ms */
function useCounter(max: number, stepMs: number, active: boolean) {
 const [n, setN] = useState(0);
 useEffect(() => {
 if (!active) return;
 if (n >= max) return;
 const t = setTimeout(() => setN(p => p + 1), stepMs);
 return () => clearTimeout(t);
 }, [n, max, stepMs, active]);
 return n;
}

/* Componente */

export function TerminalAnimated() {
 /* — fase: idle → typing → response → done → (loop) — */
 type Phase = "typing"| "response"| "done";
 const [phase, setPhase] = useState<Phase>("typing");
 const [typedChars, setTypedChars] = useState(0);
 const [respLines, setRespLines] = useState(0);
 const [events, setEvents] = useState<LiveEvent[]>([]);
 const eventIdRef = useRef(100);
 const loopTimer = useRef<ReturnType<typeof setTimeout>>(null!);

 /* Typewriter del comando curl */
 useEffect(() => {
 if (phase !== "typing") return;
 if (typedChars >= CURL_COMMAND.length) {
 // pausa breve antes de mostrar respuesta
 const t = setTimeout(() => { setPhase("response"); setRespLines(0); }, 600);
 return () => clearTimeout(t);
 }
 const delay = CURL_COMMAND[typedChars] === "\n"? 30 : 22;
 const t = setTimeout(() => setTypedChars(p => p + 1), delay);
 return () => clearTimeout(t);
 }, [phase, typedChars]);

 /* Líneas de respuesta JSON */
 useEffect(() => {
 if (phase !== "response") return;
 if (respLines >= RESPONSE_LINES.length) {
 setPhase("done");
 return;
 }
 const t = setTimeout(() => setRespLines(p => p + 1), 85);
 return () => clearTimeout(t);
 }, [phase, respLines]);

 /* Reinicio del loop completo */
 useEffect(() => {
 if (phase !== "done") return;
 loopTimer.current = setTimeout(() => {
 setPhase("typing");
 setTypedChars(0);
 setRespLines(0);
 }, 3500);
 return () => clearTimeout(loopTimer.current);
 }, [phase]);

 /* Eventos en vivo (panel derecho) */
 useEffect(() => {
 // Inicializa con los eventos base
 setEvents(BASE_EVENTS.map((e, i) => ({ ...e, id: i, fresh: false })));
 }, []);

 useEffect(() => {
 const interval = setInterval(() => {
 const base = BASE_EVENTS[Math.floor(Math.random() * BASE_EVENTS.length)];
 const id = ++eventIdRef.current;
 setEvents(prev => {
 const next = [
 { ...base, id, fresh: true },
 ...prev.map(e => ({ ...e, fresh: false })),
 ].slice(0, 7);
 return next;
 });
 }, 2400);
 return () => clearInterval(interval);
 }, []);

 /* — helpers de render — */
 const labelColor = (l: LiveEvent["label"]) =>
 l === "PAGO"? { bg: "rgba(80,250,123,0.13)", fg: "#50fa7b"} :
 l === "REEMBOLSO"? { bg: "rgba(255,184,108,0.13)", fg: "#ffb86c"} :
 { bg: "rgba(255,85,85,0.15)", fg: "#ff5555"};

 /* — cursor parpadeante — */
 const [cursorOn, setCursorOn] = useState(true);
 useEffect(() => {
 const t = setInterval(() => setCursorOn(p => !p), 530);
 return () => clearInterval(t);
 }, []);

 return (
 <div
 className="relative w-full overflow-hidden flex flex-col md:flex-row"style={{
 background: "#1a1a2e",
 minHeight: 460,
 fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
 }}
 >
 {/* PANEL IZQUIERDO — terminal */}
 <div
 className="flex flex-col flex-1 min-w-0"style={{ background: "#1e1e2e", borderRight: "1px solid rgba(255,255,255,0.07)"}}
 >
 {/* macOS bar */}
 <div
 className="flex items-center gap-2 px-4 py-3 shrink-0"style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#181825"}}
 >
 <div className="flex gap-1.5">
 {["#ff5f57","#febc2e","#28c840"].map(c => (
 <div key={c} className="h-3 w-3 rounded-full"style={{ background: c }} />
 ))}
 </div>
 <span className="text-[11px] ml-2"style={{ color: "rgba(255,255,255,0.35)"}}>
 payforce — api/payments.ts
 </span>
 {/* indicador live */}
 <div className="ml-auto flex items-center gap-1.5">
 <div className="h-1.5 w-1.5 rounded-full animate-pulse"style={{ background: "#50fa7b"}} />
 <span className="text-[10px]"style={{ color: "#50fa7b"}}>live</span>
 </div>
 </div>

 {/* Cuerpo del terminal */}
 <div
 className="flex-1 px-5 py-4 text-[12.5px] leading-[1.7] overflow-hidden"style={{ minHeight: 0 }}
 >
 {/* Prompt + comando siendo escrito */}
 <div>
 <span style={{ color: "#50fa7b"}}> </span>
 <span style={{ color: "#f8f8f2", whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
 {CURL_COMMAND.slice(0, typedChars)}
 </span>
 {phase === "typing"&& (
 <span
 style={{
 display: "inline-block", width: 7, height: 14,
 background: cursorOn ? "#bd93f9": "transparent",
 verticalAlign: "middle", borderRadius: 1,
 transition: "background 0.08s",
 }}
 />
 )}
 </div>

 {/* Líneas de respuesta */}
 {(phase === "response"|| phase === "done") && (
 <div className="mt-2">
 {RESPONSE_LINES.slice(0, respLines).map((l, i) => (
 <div key={i}>
 <span style={{ color: l.color, whiteSpace: "pre"}}>{l.text}</span>
 </div>
 ))}
 {phase === "response"&& respLines < RESPONSE_LINES.length && (
 <span
 style={{
 display: "inline-block", width: 7, height: 13,
 background: cursorOn ? "#8be9fd": "transparent",
 verticalAlign: "middle", borderRadius: 1,
 transition: "background 0.08s",
 }}
 />
 )}
 </div>
 )}

 {/* Prompt vacío cuando termina */}
 {phase === "done"&& (
 <div className="mt-2">
 <span style={{ color: "#50fa7b"}}> </span>
 <span
 style={{
 display: "inline-block", width: 7, height: 14,
 background: cursorOn ? "#bd93f9": "transparent",
 verticalAlign: "middle", borderRadius: 1,
 }}
 />
 </div>
 )}
 </div>

 {/* Footer: estado TITAN */}
 <div
 className="px-5 py-2.5 text-[10px] flex items-center gap-3 shrink-0"style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#181825"}}
 >
 <span style={{ color: "rgba(255,255,255,0.25)"}}>TITAN 1.4.1</span>
 <span style={{ color: "#50fa7b"}}> riesgo nominal</span>
 <span style={{ color: "rgba(255,255,255,0.20)"}}>score: 0.03</span>
 <span className="ml-auto tabular-nums"style={{ color: "rgba(255,255,255,0.20)"}}>
 4% + €0.40
 </span>
 </div>
 </div>

 {/* PANEL DERECHO — cobros en vivo */}
 <div
 className="flex flex-col shrink-0"style={{ width: "42%", minWidth: 220, background: "#16213e"}}
 >
 {/* Header */}
 <div
 className="flex items-center justify-between px-4 py-3 shrink-0"style={{ borderBottom: "1px solid rgba(255,255,255,0.07)"}}
 >
 <div className="flex items-center gap-2">
 <div className="h-2 w-2 rounded-full animate-pulse"style={{ background: "#50fa7b"}} />
 <span className="text-[12px] font-semibold"style={{ color: "#f8f8f2"}}>Cobros en vivo</span>
 </div>
 <span className="text-[10px] tabular-nums"style={{ color: "rgba(255,255,255,0.30)"}}>
 hoy · {events.length} eventos
 </span>
 </div>

 {/* Cabeceras */}
 <div
 className="grid px-4 py-1.5 shrink-0"style={{
 gridTemplateColumns: "52px 1fr 70px",
 borderBottom: "1px solid rgba(255,255,255,0.05)",
 }}
 >
 {["Tipo", "Usuario", "Importe"].map(h => (
 <span key={h} className="text-[9px] uppercase tracking-wider"style={{ color: "rgba(255,255,255,0.22)"}}>
 {h}
 </span>
 ))}
 </div>

 {/* Filas animadas */}
 <div className="flex-1 overflow-hidden flex flex-col">
 {events.map(e => {
 const { bg, fg } = labelColor(e.label);
 return (
 <div
 key={e.id}
 className="grid items-center px-4 py-2"style={{
 gridTemplateColumns: "52px 1fr 70px",
 borderBottom: "1px solid rgba(255,255,255,0.04)",
 background: e.fresh ? "rgba(80,250,123,0.04)": "transparent",
 transition: "background 0.6s",
 }}
 >
 <span
 className="text-[9px] font-bold rounded px-1.5 py-0.5 w-fit"style={{ background: bg, color: fg }}
 >
 {e.label}
 </span>
 <span
 className="text-[10px] truncate px-1"style={{ color: "rgba(255,255,255,0.45)"}}
 >
 {e.user}
 </span>
 <span
 className="text-[10px] font-semibold tabular-nums text-right"style={{ color: "#f8f8f2"}}
 >
 {e.amount}
 </span>
 </div>
 );
 })}
 </div>

 {/* Footer volumen */}
 <div
 className="px-4 py-3 shrink-0"style={{ borderTop: "1px solid rgba(255,255,255,0.07)"}}
 >
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <div
 className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"style={{ background: "rgba(189,147,249,0.22)", color: "#bd93f9"}}
 >
 P
 </div>
 <span className="text-[11px] font-medium"style={{ color: "#f8f8f2"}}>PayForce Systems</span>
 </div>
 <span
 className="text-[9px] rounded px-1.5 py-0.5"style={{ background: "rgba(80,250,123,0.14)", color: "#50fa7b"}}
 >
 Pro
 </span>
 </div>
 <div className="text-[10px] mb-1.5"style={{ color: "rgba(255,255,255,0.38)"}}>
 Volumen &nbsp;·&nbsp; <span style={{ color: "#f8f8f2"}}>€24.830,00</span>
 </div>
 <div className="w-full rounded-full h-1.5"style={{ background: "rgba(255,255,255,0.08)"}}>
 <div
 className="h-1.5 rounded-full transition-all duration-1000"style={{ width: "68%", background: "linear-gradient(90deg,#bd93f9,#50fa7b)"}}
 />
 </div>
 <div className="flex justify-between mt-1">
 <span className="text-[9px]"style={{ color: "rgba(255,255,255,0.22)"}}>Comisión acumulada</span>
 <span className="text-[9px]"style={{ color: "rgba(255,255,255,0.42)"}}>€994,00</span>
 </div>
 </div>
 </div>
 </div>
 );
}
