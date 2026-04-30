"use client";

import { useRef, useState } from "react";
import {
 motion,
 useScroll,
 useTransform,
 useSpring,
 MotionValue,
 useMotionValueEvent,
} from "framer-motion";

/* Chip EMV realista */
function Chip({ small = false }: { small?: boolean }) {
 const w = small ? 28 : 44;
 const h = small ? 22 : 34;
 return (
 <svg width={w} height={h} viewBox="0 0 44 34"fill="none">
 <rect x=".5"y=".5"width="43"height="33"rx="5.5"fill="url(#chipGold)"stroke="rgba(255,220,100,0.25)"/>
 {/* Líneas internas del chip */}
 <line x1="15"y1="0"x2="15"y2="34"stroke="rgba(200,160,60,0.3)"strokeWidth=".8"/>
 <line x1="29"y1="0"x2="29"y2="34"stroke="rgba(200,160,60,0.3)"strokeWidth=".8"/>
 <line x1="0"y1="11"x2="44"y2="11"stroke="rgba(200,160,60,0.3)"strokeWidth=".8"/>
 <line x1="0"y1="23"x2="44"y2="23"stroke="rgba(200,160,60,0.3)"strokeWidth=".8"/>
 {/* Contacto central */}
 <rect x="16"y="12"width="12"height="10"rx="1.5"fill="rgba(200,160,60,0.15)"stroke="rgba(220,180,80,0.4)"strokeWidth=".8"/>
 <defs>
 <linearGradient id="chipGold"x1="0"y1="0"x2="44"y2="34"gradientUnits="userSpaceOnUse">
 <stop offset="0%"stopColor="#8B6914"stopOpacity=".7"/>
 <stop offset="40%"stopColor="#D4A843"stopOpacity=".5"/>
 <stop offset="70%"stopColor="#F0CC70"stopOpacity=".4"/>
 <stop offset="100%"stopColor="#9A7520"stopOpacity=".6"/>
 </linearGradient>
 </defs>
 </svg>
 );
}

/* PayForce Card — premium */
export function PayForceCard({ small = false }: { small?: boolean }) {
 const w = small ? 215 : 360;
 const h = small ? 136 : 227;
 const r = small ? 14 : 22;
 const s = small ? 0.6 : 1;

 return (
 <div className="relative overflow-hidden select-none"style={{
 width: w, height: h, borderRadius: r,
 boxShadow: small
 ? "0 12px 40px rgba(80,20,160,0.5), 0 0 0 1px rgba(255,255,255,0.08)": "0 50px 120px rgba(80,20,160,0.55), 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.09)",
 }}>

 {/* Base gradient — púrpura eléctrico vibrante */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(140deg, #0d0621 0%, #2d0d6e 30%, #5b1fa8 60%, #7c3aed 85%, #9d5cf5 100%)"}} />

 {/* Capa iridiscente */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(120deg, rgba(180,120,255,0.18) 0%, transparent 45%, rgba(100,200,255,0.10) 80%, transparent 100%)"}} />

 {/* Brillo superior diagonal */}
 <div className="absolute"style={{
 top: 0, left: 0, right: 0, height: "55%",
 background: "linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
 }} />

 {/* Línea de luz horizontal */}
 <div className="absolute left-0 right-0"style={{ top: "48%", height: 1, background: "linear-gradient(90deg, transparent, rgba(200,160,255,0.15) 30%, rgba(220,180,255,0.25) 50%, rgba(200,160,255,0.15) 70%, transparent)"}} />

 {/* Glow orbs */}
 <div className="absolute rounded-full blur-3xl"style={{ width: w * 0.8, height: h * 0.8, top: -h*0.2, right: -w*0.2, background: "radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)"}} />
 <div className="absolute rounded-full blur-2xl"style={{ width: w * 0.5, height: h * 0.5, bottom: -h*0.1, left: -w*0.1, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"}} />

 {/* Noise texture sutil */}
 <div className="absolute inset-0 opacity-[0.06]"style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "180px"}} />

 {/* Logo PayForce — top-left */}
 <div className="absolute flex items-center gap-2"style={{ top: Math.round(18*s), left: Math.round(20*s) }}>
 <svg viewBox="0 0 20 20"width={Math.round(15*s)} height={Math.round(15*s)} fill="none">
 <polygon points="10,1.5 17.5,5.5 17.5,14.5 10,18.5 2.5,14.5 2.5,5.5"fill="rgba(255,255,255,0.18)"stroke="rgba(255,255,255,0.40)"strokeWidth="1.2"/>
 <polygon points="10,5 14.5,7.5 14.5,12.5 10,15 5.5,12.5 5.5,7.5"fill="rgba(255,255,255,0.08)"/>
 </svg>
 <span className="uppercase tracking-[2.5px] font-light text-white/60"style={{ fontSize: Math.round(9*s) }}>PayForce</span>
 </div>

 {/* Contactless NFC — top-right */}
 <div className="absolute"style={{ top: Math.round(18*s), right: Math.round(20*s) }}>
 <svg viewBox="0 0 24 24"width={Math.round(18*s)} height={Math.round(18*s)} fill="none"stroke="rgba(255,255,255,0.30)"strokeWidth="1.5">
 <path d="M8.56 2.9A7 7 0 0119 9v3m-3-6.7A4 4 0 0115 9v3M5 9a7 7 0 0014 0"/>
 <circle cx="12"cy="19"r="1"fill="rgba(255,255,255,0.30)"stroke="none"/>
 </svg>
 </div>

 {/* Chip EMV */}
 {!small && (
 <div className="absolute"style={{ top: 58, left: 20 }}>
 <Chip />
 </div>
 )}
 {small && (
 <div className="absolute"style={{ top: 36, left: 14 }}>
 <Chip small />
 </div>
 )}

 {/* Número de tarjeta */}
 <div className="absolute tracking-[3px] font-light"style={{
 bottom: Math.round(38*s), left: Math.round(20*s),
 fontSize: Math.round(11*s),
 color: "rgba(255,255,255,0.38)",
 letterSpacing: "0.22em",
 }}>
 •••• •••• •••• 4291
 </div>

 {/* Nombre + fecha */}
 <div className="absolute flex items-end justify-between"style={{ bottom: Math.round(14*s), left: Math.round(20*s), right: Math.round(20*s) }}>
 <span className="uppercase tracking-widest font-light text-white/28"style={{ fontSize: Math.round(8.5*s) }}>PayForce User</span>
 <span className="text-white/25"style={{ fontSize: Math.round(8.5*s) }}>12/29</span>
 </div>

 {/* Mastercard circles — bottom-right */}
 <div className="absolute flex items-center"style={{ bottom: Math.round(12*s), right: Math.round(18*s) }}>
 <div className="rounded-full"style={{ width: Math.round(22*s), height: Math.round(22*s), background: "rgba(235,0,27,0.55)"}} />
 <div className="rounded-full"style={{ width: Math.round(22*s), height: Math.round(22*s), marginLeft: -Math.round(9*s), background: "rgba(255,160,0,0.45)"}} />
 </div>
 </div>
 );
}

/* iPhone 15 Pro ultra realista */
function RealisticPhone({ cardProgress }: { cardProgress: MotionValue<number> }) {
 const [prog, setProg] = useState(0);
 useMotionValueEvent(cardProgress, "change", v => setProg(v));

 return (
 <div className="relative"style={{ width: 290, height: 590 }}>

 {/* Glow exterior violeta */}
 <div className="absolute pointer-events-none"style={{
 inset: -24,
 background: "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(124,58,237,0.22) 0%, transparent 70%)",
 filter: "blur(8px)",
 }} />

 {/* Sombra del cuerpo */}
 <div className="absolute inset-x-6 -bottom-6 h-12 rounded-full blur-2xl"style={{ background: "rgba(0,0,0,0.6)"}} />

 {/* Marco de titanio — gradiente metálico */}
 <div className="absolute inset-0 rounded-[52px]"style={{
 background: "linear-gradient(145deg, #5a5a60 0%, #2e2e34 25%, #1c1c22 50%, #2a2a32 75%, #4a4a52 100%)",
 boxShadow: "0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)",
 }} />

 {/* Interior (bisel de pantalla) */}
 <div className="absolute rounded-[50px] bg-black"style={{ inset: 2 }} />

 {/* Pantalla */}
 <div className="absolute overflow-hidden rounded-[46px] bg-black"style={{ inset: 4 }}>

 {/* Fondo de pantalla oscuro degradado */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(180deg, #0c0c14 0%, #080810 100%)"}} />

 {/* Fondo glow violeta sutil */}
 <div className="absolute inset-0"style={{ background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(100,60,200,0.12) 0%, transparent 60%)"}} />

 {/* Status bar */}
 <div className="relative flex items-center justify-between px-7 pt-4 pb-1 z-10">
 <span className="text-[11px] font-medium text-white/70">9:41</span>
 <div className="flex items-center gap-1.5">
 {/* Signal */}
 <svg viewBox="0 0 17 12"width="14"height="10"fill="rgba(255,255,255,0.7)">
 <rect x="0"y="5"width="3"height="7"rx=".8"/>
 <rect x="4.5"y="3"width="3"height="9"rx=".8"/>
 <rect x="9"y="1"width="3"height="11"rx=".8"/>
 <rect x="13.5"y="0"width="3"height="12"rx=".8"opacity=".3"/>
 </svg>
 {/* Wifi */}
 <svg viewBox="0 0 16 11"width="14"height="10"fill="none">
 <path d="M8 8.5a1 1 0 110 2 1 1 0 010-2z"fill="rgba(255,255,255,0.7)"/>
 <path d="M4.8 6.3C5.9 5.2 6.9 4.7 8 4.7s2.1.5 3.2 1.6"stroke="rgba(255,255,255,0.7)"strokeWidth="1.3"strokeLinecap="round"fill="none"/>
 <path d="M2 3.8C4 1.8 5.9 1 8 1s4 .8 6 2.8"stroke="rgba(255,255,255,0.5)"strokeWidth="1.3"strokeLinecap="round"fill="none"/>
 </svg>
 {/* Battery */}
 <div className="flex items-center gap-0.5">
 <div className="rounded-sm border border-white/50 flex items-center px-0.5"style={{ width: 22, height: 11 }}>
 <div className="rounded-sm bg-white/80"style={{ width: "75%", height: 7 }} />
 </div>
 <div className="rounded-sm bg-white/40"style={{ width: 2, height: 5 }} />
 </div>
 </div>
 </div>

 {/* Dynamic Island */}
 <div className="absolute top-3.5 left-1/2 -translate-x-1/2 rounded-full z-20"style={{ width: 96, height: 24, background: "#000", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)"}} />

 {/* Contenido: Apple Wallet UI */}
 <div className="absolute top-16 left-0 right-0 bottom-0 overflow-hidden">

 {/* Header Wallet */}
 <div className="flex items-center justify-between px-6 mb-5">
 <span className="text-[20px] font-semibold text-white">Wallet</span>
 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
 <span className="text-white/70 text-[18px] leading-none">+</span>
 </div>
 </div>

 {/* Stack de tarjetas */}
 <div className="relative mx-4"style={{ height: 320 }}>

 {/* Tarjetas del fondo */}
 {[
 { grad: "linear-gradient(135deg,#1a3a1a,#0d2010)", label: "BBVA", offset: 0 },
 { grad: "linear-gradient(135deg,#1a1a3a,#0d0d20)", label: "Revolut", offset: 14 },
 { grad: "linear-gradient(135deg,#2a1010,#1a0808)", label: "N26", offset: 28 },
 ].map((c, i) => (
 <div key={i} className="absolute inset-x-0 rounded-[14px] border border-white/[0.07]"style={{ top: c.offset, height: 82, background: c.grad, zIndex: i + 1 }}>
 <span className="absolute bottom-2.5 left-4 text-[9px] tracking-wider text-white/18 uppercase">{c.label}</span>
 </div>
 ))}

 {/* PayForce card entrando con animación de scroll */}
 <div className="absolute inset-x-0 z-10"style={{
 top: 28 + (1 - prog) * -200,
 opacity: Math.max(0, prog * 2 - 0.2),
 transform: `scale(${0.72 + prog * 0.28})`,
 transformOrigin: "top center",
 transition: "none",
 }}>
 <PayForceCard small />
 </div>
 </div>

 {/* Pie de pantalla */}
 <div className="absolute bottom-8 left-0 right-0 flex justify-center">
 <div className="h-1 w-28 rounded-full bg-white/20"/>
 </div>
 </div>
 </div>

 {/* Botón lateral derecho (power) */}
 <div className="absolute rounded-l-sm"style={{ right: -3, top: "27%", width: 3.5, height: 52,
 background: "linear-gradient(180deg, #555 0%, #333 50%, #444 100%)",
 boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)"}} />

 {/* Botones volumen izquierdo */}
 <div className="absolute rounded-r-sm"style={{ left: -3, top: "18%", width: 3.5, height: 36,
 background: "linear-gradient(180deg, #555 0%, #333 50%, #444 100%)",
 boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)"}} />
 <div className="absolute rounded-r-sm"style={{ left: -3, top: "26%", width: 3.5, height: 48,
 background: "linear-gradient(180deg, #555 0%, #333 50%, #444 100%)",
 boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)"}} />

 {/* Silencio */}
 <div className="absolute rounded-r-sm"style={{ left: -3, top: "12%", width: 3.5, height: 22,
 background: "linear-gradient(180deg, #555 0%, #333 100%)"}} />
 </div>
 );
}

/* Main Section */
export function CardScrollSection() {
 const containerRef = useRef<HTMLDivElement>(null);

 const { scrollYProgress } = useScroll({
 target: containerRef,
 offset: ["start start", "end end"],
 });

 const smooth = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 0.9 });

 /* Tarjeta grande */
 const cardScale = useTransform(smooth, [0, 0.55], [1, 0.26]);
 const cardY = useTransform(smooth, [0, 0.55], [0, 148]);
 const cardRotateX = useTransform(smooth, [0, 0.55], [0, 14]);
 const cardOpacity = useTransform(smooth, [0.48, 0.65], [1, 0]);

 /* Streaks */
 const streakOpacity = useTransform(smooth, [0, 0.10, 0.58, 0.75], [0, 1, 1, 0]);

 /* Teléfono */
 const phoneOpacity = useTransform(smooth, [0.08, 0.38], [0, 1]);
 const phoneY = useTransform(smooth, [0.08, 0.38], [60, 0]);
 const phoneScale = useTransform(smooth, [0.08, 0.38], [0.90, 1]);

 /* Progreso tarjeta → wallet */
 const walletProgress = useTransform(smooth, [0.36, 0.74], [0, 1]);

 /* Hint scroll */
 const hintOpacity = useTransform(smooth, [0, 0.05], [1, 0]);

 return (
 <div ref={containerRef} style={{ height: "320vh"}}>
 <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center"style={{ background: "#fafafa", perspective: 1400 }}>

 {/* Vignette */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 110% 90% at 50% 50%, transparent 45%, rgba(230,230,230,0.80))"}} />

 {/* Streaks de velocidad */}
 <motion.div style={{ opacity: streakOpacity }}
 className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
 {Array.from({ length: 11 }).map((_, i) => {
 const off = (i - 5) * 20;
 const alpha = 0.28 - Math.abs(i - 5) * 0.022;
 return (
 <div key={i} className="absolute w-full"style={{ top: `calc(50% + ${off}px)`, height: 1,
 background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.35) 25%, rgba(167,139,250,0.65) 50%, rgba(124,58,237,0.35) 75%, transparent)",
 opacity: alpha }} />
 );
 })}
 </motion.div>

 {/* iPhone */}
 <motion.div
 className="absolute"style={{ opacity: phoneOpacity, y: phoneY, scale: phoneScale }}>
 <RealisticPhone cardProgress={walletProgress} />
 </motion.div>

 {/* Tarjeta grande animada */}
 <motion.div
 className="absolute z-20"style={{ scale: cardScale, y: cardY, rotateX: cardRotateX, opacity: cardOpacity, transformOrigin: "center top"}}>
 <PayForceCard />
 </motion.div>

 {/* Scroll hint */}
 <motion.div style={{ opacity: hintOpacity }}
 className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
 <motion.div
 animate={{ y: [0, 7, 0] }}
 transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut"}}
 className="h-10 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"/>
 <p className="text-[10px] tracking-[4px] uppercase"style={{ color: "rgba(0,0,0,0.30)"}}>Scroll</p>
 </motion.div>
 </div>
 </div>
 );
}
