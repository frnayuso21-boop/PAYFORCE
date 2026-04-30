"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const ACCENT = "#FF5500";
const INK = "#16162a";
const MUTE = "rgba(22,22,42,0.50)";

/* Screens de los teléfonos */

/* Pantalla de apertura de cuenta rápida */
function ScreenSpeed() {
 return (
 <div className="h-full px-4 pt-2"style={{ background: "#0d0d0d"}}>
 <p className="text-[9px] tracking-[2px] uppercase text-white/30 mb-3">PayForce · Inicio rápido</p>
 <div className="flex flex-col gap-2 mb-3">
 {[
 { label: "Cuenta verificada", time: "00:12s", done: true },
 { label: "Identidad confirmada", time: "00:26s", done: true },
 { label: "Link de pago creado", time: "00:31s", done: true },
 { label: "Primer cobro recibido",time: "Live", done: false },
 ].map(({ label, time, done }) => (
 <div key={label} className="flex items-center gap-2 rounded-xl px-2.5 py-2"style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)"}}>
 <span className={`text-[10px] ${done ? "text-emerald-400": "text-white/20"}`}>
 {done ? "": ""}
 </span>
 <p className="flex-1 text-[9px] text-white/70">{label}</p>
 <span className={`text-[8px] ${done ? "text-emerald-400/70": "text-white/25"}`}>{time}</span>
 </div>
 ))}
 </div>
 <div className="rounded-xl p-2.5"style={{ background: "rgba(13,223,200,0.07)", border: "1px solid rgba(13,223,200,0.18)"}}>
 <p className="text-[8px] text-white/25 mb-0.5">Primer cobro</p>
 <p className="text-[22px] text-white leading-none">€1.200,00</p>
 <div className="mt-1.5 flex items-center gap-1.5">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
 <p className="text-[8px] text-emerald-400/70">Sin límite de importe · Volumen ilimitado</p>
 </div>
 </div>
 </div>
 );
}

/* Terminal TITAN 1.4.1 */
function TitanTerminal() {
 const logs: { t: string; label?: string; value?: string; c?: string }[] = [
 { t: "head"},
 { t: "divider"},
 { t: "row", label: "Transaction", value: "tx_9kXp2 · €1.200,00"},
 { t: "row", label: "IP", value: "82.131.22.14 · ES-MAD"},
 { t: "row", label: "Card", value: "•••• 4821 Visa"},
 { t: "divider"},
 { t: "check", label: "Velocity check", value: "PASS", c: "ok"},
 { t: "check", label: "Geolocation match", value: "PASS", c: "ok"},
 { t: "check", label: "BIN country match", value: "PASS", c: "ok"},
 { t: "check", label: "Device fingerprint", value: "NEW", c: "warn"},
 { t: "check", label: "Duplicate payment", value: "PASS", c: "ok"},
 { t: "divider"},
 { t: "ai"},
 { t: "divider"},
 { t: "score"},
 ];

 return (
 <div className="relative w-full rounded-2xl overflow-hidden"style={{
 background: "linear-gradient(160deg, #1a0f2e 0%, #110a22 40%, #0d0818 100%)",
 boxShadow: "0 0 80px rgba(139,92,246,0.20), 0 32px 80px rgba(0,0,0,0.40)",
 fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
 }}>

 {/* Glow superior para iluminar la parte de arriba */}
 <div className="pointer-events-none absolute top-0 left-0 right-0"style={{ height: 120, background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(139,92,246,0.22) 0%, transparent 100%)"}} />

 {/* Barra superior — tipo macOS dark */}
 <div className="relative flex items-center gap-2 px-4 py-3"style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(139,92,246,0.08)"}}>
 <div className="flex gap-1.5">
 <div className="h-2.5 w-2.5 rounded-full"style={{ background: "#ff5f57"}} />
 <div className="h-2.5 w-2.5 rounded-full"style={{ background: "#febc2e"}} />
 <div className="h-2.5 w-2.5 rounded-full"style={{ background: "#28c840"}} />
 </div>
 <span className="mx-auto text-[10px] tracking-wider"style={{ color: "rgba(255,255,255,0.45)"}}>TITAN 1.4.1 — fraud-detection</span>
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
 </div>

 {/* Cuerpo */}
 <div className="relative px-5 py-4 text-[11px] leading-none space-y-0">

 {/* Cabecera */}
 <div className="mb-3">
 <p className="text-[13px] font-bold tracking-wide"style={{ color: "#c4b5fd"}}>TITAN 1.4.1</p>
 <p className="text-[10px] mt-0.5"style={{ color: "rgba(255,255,255,0.45)"}}>Fraud Detection Engine · Status: <span style={{ color: "#34d399"}}>LIVE</span></p>
 </div>

 <div className="border-t mb-3"style={{ borderColor: "rgba(255,255,255,0.07)"}} />

 {/* Datos de la transacción */}
 {[
 { label: "Transaction", value: "tx_9kXp2 · €1.200,00", vc: "#f1f5f9"},
 { label: "IP Origin", value: "82.131.22.14 · ES-MAD", vc: "#cbd5e1"},
 { label: "Card", value: "•••• 4821 Visa Platinum", vc: "#cbd5e1"},
 ].map(r => (
 <div key={r.label} className="flex items-baseline gap-2 py-[3px]">
 <span className="w-24 shrink-0 text-[10px]"style={{ color: "rgba(255,255,255,0.45)"}}>{r.label}</span>
 <span className="text-[11px]"style={{ color: r.vc }}>{r.value}</span>
 </div>
 ))}

 <div className="border-t my-3"style={{ borderColor: "rgba(255,255,255,0.07)"}} />

 {/* Checks */}
 {[
 { label: "Velocity check", value: "PASS", ok: true },
 { label: "Geolocation match", value: "PASS", ok: true },
 { label: "BIN country match", value: "PASS", ok: true },
 { label: "Device fingerprint", value: "NEW ", ok: false },
 { label: "Duplicate payment", value: "PASS", ok: true },
 ].map(r => (
 <div key={r.label} className="flex items-center justify-between py-[3px]">
 <span className="text-[10px]"style={{ color: "rgba(255,255,255,0.60)"}}>
 {r.ok ? "": ""} {r.label}
 </span>
 <span className="text-[10px] font-semibold"style={{ color: r.ok ? "#4ade80": "#fbbf24"}}>
 {r.value}
 </span>
 </div>
 ))}

 <div className="border-t my-3"style={{ borderColor: "rgba(255,255,255,0.07)"}} />

 {/* AI inference */}
 <div className="rounded-lg px-3 py-2.5 mb-3"style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)"}}>
 <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5"style={{ color: "#818cf8"}}>AI Inference</p>
 <p className="text-[10.5px] leading-relaxed"style={{ color: "rgba(255,255,255,0.80)"}}>
 &ldquo;Low risk. New device but IP matches billing country. Behavioral pattern normal.&rdquo;
 </p>
 </div>

 {/* Score final */}
 <div className="flex items-center justify-between rounded-lg px-3 py-2.5"style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)"}}>
 <div>
 <p className="text-[9px] uppercase tracking-widest"style={{ color: "rgba(255,255,255,0.30)"}}>Fraud Score</p>
 <p className="text-[20px] font-bold mt-0.5"style={{ color: "#34d399", letterSpacing: "-0.03em"}}>0.04</p>
 </div>
 <div className="text-right">
 <p className="text-[13px] font-bold"style={{ color: "#34d399"}}>APPROVED </p>
 <p className="text-[9px] mt-0.5"style={{ color: "rgba(255,255,255,0.45)"}}>Latency: 142ms</p>
 </div>
 </div>

 {/* Cursor */}
 <div className="mt-3 flex items-center gap-1.5">
 <span className="text-[10px]"style={{ color: "rgba(255,255,255,0.20)"}}>$</span>
 <div className="h-[11px] w-[5px] rounded-sm animate-pulse"style={{ background: "#a78bfa"}} />
 </div>
 </div>
 </div>
 );
}

/* Card visual sin teléfono */
function SectionCard({ screen }: { screen: React.ReactNode }) {
 return (
 <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden"style={{
 background: "#0d0d0d",
 border: "1px solid rgba(255,255,255,0.08)",
 boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
 }}>
 <div className="flex items-center gap-1.5 px-4 py-3"style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)"}}>
 <div className="h-2 w-2 rounded-full"style={{ background: "#ff5f57"}} />
 <div className="h-2 w-2 rounded-full"style={{ background: "#febc2e"}} />
 <div className="h-2 w-2 rounded-full"style={{ background: "#28c840"}} />
 </div>
 <div style={{ minHeight: 320 }}>{screen}</div>
 </div>
 );
}

/* Datos de las secciones */
const SECTIONS: Array<{
 num: string; color: string; tag: string; title: string;
 body: string; bullets: string[]; cta: string; href: string;
 screen?: React.ReactNode; visual?: React.ReactNode; flip: boolean;
}> = [
 {
 num: "1", color: "#F59E0B", tag: "Motor de detección de fraude", title: "TITAN 1.4.1",
 body: "Radar de fraude propio en tiempo real. Analiza cada transacción con más de 10 señales de riesgo — velocidad, geolocalización, huella de dispositivo y más — en menos de 200ms.",
 bullets: [
 "10+ señales de riesgo por transacción",
 "Scoring en tiempo real: aprobado o bloqueado",
 "Reglas personalizables por negocio",
 ],
 cta: "Explorar TITAN 1.4.1", href: "/solutions#titan",
 visual: <TitanTerminal />, flip: false,
 },
 {
 num: "2", color: ACCENT, tag: "Cobros instantáneos", title: "Payment Links",
 body: "Crea un payment link en 3 segundos. Checkout mobile-first con 84% de conversión — sin código ni integración.",
 bullets: [
 "Links con expiración y personalización de marca",
 "Checkout optimizado para móvil",
 "Webhook y email automáticos",
 ],
 cta: "Explorar Payment Links", href: "/solutions",
 screen: null, flip: true,
 },
 {
 num: "3", color: "#10B981", tag: "Apertura instantánea", title: "30 s para empezar a cobrar",
 body: "Sin formularios interminables ni esperas. Abre tu cuenta, crea tu primer link de pago y empieza a mover dinero sin límites de importe ni de volumen.",
 bullets: [
 "Alta verificada en tiempo real",
 "Link de pago en menos de 3 segundos",
 "Volúmenes ilimitados sin topes",
 "Sin permanencia ni papeleo",
 ],
 cta: "Crear cuenta gratis", href: "/signup",
 screen: <ScreenSpeed />, flip: false,
 },
];

/* 
 TimelineSections
 */
export function TimelineSections() {
 const containerRef = useRef<HTMLDivElement>(null);

 const { scrollYProgress } = useScroll({
 target: containerRef,
 offset: ["start 80%", "end 20%"],
 });

 const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
 const n1 = useTransform(scrollYProgress, [0, 0.15], [0.25, 1]);
 const n2 = useTransform(scrollYProgress, [0.30, 0.50], [0.25, 1]);
 const n3 = useTransform(scrollYProgress, [0.65, 0.85], [0.25, 1]);
 const numOpacities = [n1, n2, n3];

 return (
 <div
 ref={containerRef}
 style={{
 background: "#F7F5F0",
 overflow: "hidden",
 width: "100%",
 borderRadius: "48px 48px 0 0",
 }}
 >
 <div className="relative flex">

 {/* Columna timeline */}
 <div className="relative hidden md:flex flex-col items-center pt-24 pb-24"style={{ width: 88, flexShrink: 0 }}>

 <div className="absolute top-0 bottom-0"style={{ left: 40, width: 4, borderRadius: 4, background: "rgba(22,22,42,0.08)"}} />

 <div className="absolute top-0 overflow-hidden"style={{ left: 40, bottom: 0, width: 4, borderRadius: 4 }}>
 <motion.div
 style={{
 height: lineHeight,
 width: "100%",
 borderRadius: 4,
 background: `linear-gradient(to bottom, #FF5500, #FF7A00, #FFAA00)`,
 boxShadow: `0 0 16px #FF550099, 0 0 40px #FF550055, 0 0 6px #FF5500`,
 }}
 />
 </div>

 {SECTIONS.map((s, i) => (
 <motion.div
 key={s.num}
 className="absolute flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold text-white"style={{
 left: 18,
 top: `calc(${[16, 49, 82][i]}% - 22px)`,
 background: `linear-gradient(135deg, #FF5500, #FF8C00)`,
 boxShadow: `0 0 0 5px #F7F5F0, 0 0 20px #FF550080, 0 0 6px #FF5500`,
 opacity: numOpacities[i],
 zIndex: 2,
 }}
 >
 {s.num}
 </motion.div>
 ))}
 </div>

 {/* Contenido */}
 <div className="flex-1 min-w-0">
 {SECTIONS.map((s, i) => (
 <div key={s.num}>
 <section className="relative flex min-h-[80vh] items-center px-4 py-14 md:min-h-screen md:px-12 md:py-20">
 <div className={`mx-auto flex w-full max-w-4xl flex-col items-center gap-10 md:flex-row md:gap-20 ${s.flip ? "md:flex-row-reverse": ""}`}>

 {/* Texto */}
 <div className="flex-1 flex flex-col gap-5">
 <div className="flex md:hidden items-center gap-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium text-white"style={{ background: ACCENT }}>
 {s.num}
 </div>
 </div>
 <div>
 <span className="text-[10px] tracking-[2.5px] uppercase"style={{ color: s.color, opacity: 0.8 }}>
 {s.tag}
 </span>
 </div>
 <h2 className="text-[40px] leading-tight md:text-[52px]"style={{ letterSpacing: "-0.025em", fontWeight: 400, color: INK }}>
 {s.title}
 </h2>
 <p className="text-[18px] leading-relaxed"style={{ color: MUTE }}>
 {s.body}
 </p>
 <ul className="flex flex-col gap-2">
 {s.bullets.map(b => (
 <li key={b} className="flex items-start gap-2.5">
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"style={{ color: s.color, opacity: 0.7 }} />
 <span className="text-[15px] leading-relaxed"style={{ color: MUTE }}>{b}</span>
 </li>
 ))}
 </ul>
 <Link href={s.href}
 className="inline-flex items-center gap-1.5 text-[14px] transition-opacity hover:opacity-60 mt-1"style={{ color: INK }}>
 {s.cta} <ArrowRight className="h-3.5 w-3.5"/>
 </Link>
 </div>

 {/* Visual */}
 <div className="flex-1 flex justify-center w-full">
 {s.visual
 ? <div className="w-full max-w-md">{s.visual}</div>
 : <SectionCard screen={s.screen} />
 }
 </div>
 </div>
 </section>

 {i < SECTIONS.length - 1 && (
 <div style={{ height: 1, background: "rgba(22,22,42,0.07)", margin: "0 64px"}} />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
