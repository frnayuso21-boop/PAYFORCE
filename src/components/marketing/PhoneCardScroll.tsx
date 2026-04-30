"use client";

/**
 * PhoneCardScroll — Scroll-driven premium fintech animation.
 *
 * How it works:
 * 
 * 1. A sticky viewport (h-screen) sits inside a tall container (250vh).
 * 2. scrollYProgress [0 → 1] drives all transforms via useTransform.
 * 3. A spring wraps scrollYProgress so motion feels organic, not mechanical.
 * 4. Layering (z-index) creates the depth illusion:
 * z-0 background glow orbs
 * z-10 phone screen content (behind card)
 * z-20 animated payment card
 * z-30 SVG phone frame with a masked screen cutout ← key to the trick
 * z-40 Dynamic Island + side buttons (cosmetic details)
 * 5. The SVG frame mask cuts a transparent rectangle exactly where the screen
 * is, so the card (z-20) is VISIBLE through the screen while the phone
 * body (z-30) appears IN FRONT — the card looks like it entered the phone.
 *
 * Tweaking timing:
 * 
 * - cardEnterEnd (0.72): how far into scroll the card is fully inside the phone.
 * - spring stiffness/damping: lower stiffness = slower/floatier feel.
 * - cardScale end (0.36): adjust to fit card inside phone screen precisely.
 * - cardY range (-30): final vertical offset of card inside the phone.
 */

import { useId, useRef } from "react";
import {
 motion,
 useScroll,
 useTransform,
 useSpring,
 MotionValue,
} from "framer-motion";

/* 
 CONSTANTS
 */
const PHONE_W = 275;
const PHONE_H = 560;
const PHONE_R = 52; // outer border-radius
const SCREEN_INSET = 10; // gap between phone edge and screen
const SCREEN_R = 40; // screen border-radius
const ACCENT = "#111111";

/* 
 PAYMENT CARD
 */
function PremiumCard() {
 return (
 <div
 className="relative overflow-hidden select-none"style={{
 width: 360, height: 227, borderRadius: 22,
 /* Multi-layer shadow for floating effect */
 boxShadow: `0 2px 4px rgba(0,0,0,0.3),
 0 12px 32px rgba(80,20,160,0.4),
 0 40px 80px rgba(0,0,0,0.5),
 0 0 0 1px rgba(255,255,255,0.09)
 `,
 }}
 >
 {/* Base gradient — deep violet to electric purple */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(140deg, #0d0621 0%, #2d0d6e 28%, #5b1fa8 58%, #7c3aed 82%, #a78bfa 100%)"}} />

 {/* Iridescent shimmer layer */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(115deg, rgba(200,150,255,0.15) 0%, transparent 40%, rgba(100,200,255,0.08) 80%)"}} />

 {/* Top-half gloss */}
 <div className="absolute inset-x-0 top-0"style={{ height: "52%", background: "linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)"}} />

 {/* Horizontal shimmer line */}
 <div className="absolute inset-x-0"style={{ top: "47%", height: 1, background: "linear-gradient(90deg, transparent, rgba(210,170,255,0.20) 30%, rgba(230,200,255,0.35) 50%, rgba(210,170,255,0.20) 70%, transparent)"}} />

 {/* Ambient glow orbs */}
 <div className="absolute rounded-full blur-3xl"style={{ width: 280, height: 180, top: -80, right: -60, background: "rgba(167,139,250,0.18)"}} />
 <div className="absolute rounded-full blur-2xl"style={{ width: 180, height: 120, bottom: -40, left: -30, background: "rgba(99,102,241,0.14)"}} />

 {/* Grain texture */}
 <div className="absolute inset-0 opacity-[0.055]"style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "180px"}} />

 {/* Logo — top left */}
 <div className="absolute flex items-center gap-2"style={{ top: 20, left: 22 }}>
 <svg viewBox="0 0 20 20"width={14} height={14} fill="none">
 <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5"fill="rgba(255,255,255,0.16)"stroke="rgba(255,255,255,0.38)"strokeWidth="1.2"/>
 <polygon points="10,5 15,7.8 15,12.2 10,15 5,12.2 5,7.8"fill="rgba(255,255,255,0.07)"/>
 </svg>
 <span className="uppercase tracking-[2.5px] font-light text-white/55"style={{ fontSize: 9 }}>
 PayForce
 </span>
 </div>

 {/* Contactless NFC — top right */}
 <div className="absolute"style={{ top: 20, right: 22 }}>
 <svg viewBox="0 0 24 24"width={18} height={18} fill="none"stroke="rgba(255,255,255,0.28)"strokeWidth="1.5">
 <path d="M8 3a9 9 0 010 18M12 7a5 5 0 010 10M16 5a11 11 0 010 14"/>
 </svg>
 </div>

 {/* EMV Chip */}
 <div className="absolute"style={{ top: 58, left: 22 }}>
 <svg width="44"height="34"viewBox="0 0 44 34"fill="none">
 <rect x=".5"y=".5"width="43"height="33"rx="5.5"fill="url(#cg)"stroke="rgba(220,180,80,0.25)"/>
 <line x1="15"y1="0"x2="15"y2="34"stroke="rgba(200,155,60,0.25)"strokeWidth=".8"/>
 <line x1="29"y1="0"x2="29"y2="34"stroke="rgba(200,155,60,0.25)"strokeWidth=".8"/>
 <line x1="0"y1="11"x2="44"y2="11"stroke="rgba(200,155,60,0.25)"strokeWidth=".8"/>
 <line x1="0"y1="23"x2="44"y2="23"stroke="rgba(200,155,60,0.25)"strokeWidth=".8"/>
 <rect x="16"y="12"width="12"height="10"rx="1.5"fill="rgba(200,155,60,0.12)"stroke="rgba(220,175,75,0.35)"strokeWidth=".8"/>
 <defs>
 <linearGradient id="cg"x1="0"y1="0"x2="44"y2="34"gradientUnits="userSpaceOnUse">
 <stop offset="0%"stopColor="#8B6914"stopOpacity=".65"/>
 <stop offset="45%"stopColor="#D4A843"stopOpacity=".45"/>
 <stop offset="75%"stopColor="#F0CC70"stopOpacity=".35"/>
 <stop offset="100%"stopColor="#9A7520"stopOpacity=".55"/>
 </linearGradient>
 </defs>
 </svg>
 </div>

 {/* Card number */}
 <div className="absolute tracking-[3.5px] font-light text-white/36"style={{ bottom: 42, left: 22, fontSize: 12, letterSpacing: "0.22em"}}>
 •••• •••• •••• 4291
 </div>

 {/* Cardholder + expiry */}
 <div className="absolute flex justify-between items-end"style={{ bottom: 16, left: 22, right: 22 }}>
 <span className="uppercase tracking-widest font-light text-white/26"style={{ fontSize: 9 }}>
 PayForce User
 </span>
 <span className="text-white/22"style={{ fontSize: 9 }}>12/29</span>
 </div>

 {/* Network circles */}
 <div className="absolute flex"style={{ bottom: 14, right: 20 }}>
 <div className="rounded-full"style={{ width: 24, height: 24, background: "rgba(235,0,27,0.55)"}} />
 <div className="rounded-full"style={{ width: 24, height: 24, marginLeft: -10, background: "rgba(255,160,0,0.45)"}} />
 </div>
 </div>
 );
}

/* 
 PHONE SCREEN CONTENT
 */
function WalletScreen() {
 return (
 <div className="flex flex-col h-full"style={{ background: "linear-gradient(180deg, #0c0c14 0%, #07070e 100%)"}}>
 {/* Status bar */}
 <div className="flex justify-between items-center px-6 pt-4 pb-1">
 <span className="text-[11px] font-medium text-white/60">9:41</span>
 <div className="flex items-center gap-1.5">
 <svg viewBox="0 0 17 12"width="14"height="10"fill="rgba(255,255,255,0.6)">
 <rect x="0"y="5"width="3"height="7"rx=".7"/>
 <rect x="4.5"y="3"width="3"height="9"rx=".7"/>
 <rect x="9"y="1"width="3"height="11"rx=".7"/>
 <rect x="13.5"y="0"width="3"height="12"rx=".7"opacity=".3"/>
 </svg>
 <div className="flex items-center gap-0.5">
 <div className="rounded-sm border border-white/45 flex items-center px-0.5"style={{ width: 22, height: 11 }}>
 <div className="rounded-sm bg-white/75"style={{ width: "72%", height: 7 }} />
 </div>
 </div>
 </div>
 </div>

 {/* Wallet title + add button */}
 <div className="flex justify-between items-center px-6 mt-3 mb-5">
 <span className="text-[20px] font-semibold text-white">Wallet</span>
 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 text-lg leading-none">+</div>
 </div>

 {/* Stacked background cards */}
 <div className="relative mx-4">
 {[
 { grad: "linear-gradient(135deg,#1a3a1a,#0a1f0a)", label: "BBVA Débito", top: 0 },
 { grad: "linear-gradient(135deg,#1a1a3d,#0a0a22)", label: "Revolut Metal", top: 14 },
 { grad: "linear-gradient(135deg,#2e1010,#180808)", label: "N26 Black", top: 28 },
 ].map((c, i) => (
 <div key={i} className="absolute inset-x-0 rounded-[14px] border border-white/[0.06]"style={{ top: c.top, height: 82, background: c.grad, zIndex: i + 1 }}>
 <span className="absolute bottom-2.5 left-4 text-[9px] tracking-widest text-white/18 uppercase">{c.label}</span>
 </div>
 ))}
 {/* PayForce card placeholder (shows when card animation completes) */}
 <div className="absolute inset-x-0 rounded-[14px] border border-violet-500/20 z-10"style={{ top: 28, height: 82, background: "linear-gradient(135deg,#2d0d6e,#1a0842)"}}>
 <span className="absolute bottom-2.5 left-4 text-[9px] tracking-widest text-violet-300/40 uppercase">PayForce</span>
 </div>

 {/* Spacer */}
 <div style={{ height: 120 }} />
 </div>

 {/* Bottom info */}
 <div className="px-6 mt-auto pb-6">
 <p className="text-[10px] text-white/20 tracking-wider mb-1">4 TARJETAS</p>
 <div className="h-1 w-28 mx-auto rounded-full bg-white/20 mt-6"/>
 </div>
 </div>
 );
}

/* 
 SVG PHONE FRAME — the key depth-illusion layer
 A rectangle with the phone gradient, masked so the screen area
 is transparent, allowing the card (z-20) to show through while
 the phone body (z-30) appears in front.
 */
function PhoneFrameMask() {
 const id = useId();
 const sw = PHONE_W - SCREEN_INSET * 2;
 const sh = PHONE_H - SCREEN_INSET * 2;

 return (
 <svg
 width={PHONE_W}
 height={PHONE_H}
 style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none"}}
 >
 <defs>
 {/* Phone body gradient (titanium / dark metal) */}
 <linearGradient id={`${id}-g`} x1="0"y1="0"x2={PHONE_W} y2={PHONE_H} gradientUnits="userSpaceOnUse">
 <stop offset="0%"stopColor="#585860"/>
 <stop offset="25%"stopColor="#2e2e38"/>
 <stop offset="55%"stopColor="#18181f"/>
 <stop offset="80%"stopColor="#242430"/>
 <stop offset="100%"stopColor="#484852"/>
 </linearGradient>
 {/* Inner edge highlight (gives the frame depth) */}
 <linearGradient id={`${id}-h`} x1="0"y1="0"x2={PHONE_W} y2={PHONE_H} gradientUnits="userSpaceOnUse">
 <stop offset="0%"stopColor="rgba(255,255,255,0.18)"/>
 <stop offset="50%"stopColor="rgba(255,255,255,0.04)"/>
 <stop offset="100%"stopColor="rgba(0,0,0,0.20)"/>
 </linearGradient>

 {/* MASK: white = render phone body, black = transparent screen hole */}
 <mask id={`${id}-m`}>
 <rect width={PHONE_W} height={PHONE_H} rx={PHONE_R} fill="white"/>
 <rect x={SCREEN_INSET} y={SCREEN_INSET} width={sw} height={sh} rx={SCREEN_R} fill="black"/>
 </mask>
 </defs>

 {/* Phone body with screen hole */}
 <rect width={PHONE_W} height={PHONE_H} rx={PHONE_R} fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />

 {/* Inner edge highlight ring */}
 <rect width={PHONE_W} height={PHONE_H} rx={PHONE_R} fill={`url(#${id}-h)`} mask={`url(#${id}-m)`} opacity=".6"/>

 {/* Outer shadow ring */}
 <rect x=".5"y=".5"width={PHONE_W - 1} height={PHONE_H - 1} rx={PHONE_R - 0.5}
 fill="none"stroke="rgba(255,255,255,0.10)"strokeWidth="1"/>

 {/* Dynamic Island */}
 <rect
 x={PHONE_W / 2 - 44} y={SCREEN_INSET + 11}
 width={88} height={23} rx={11.5}
 fill="black"style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))"}}
 />

 {/* Subtle inner screen bezel */}
 <rect
 x={SCREEN_INSET} y={SCREEN_INSET} width={sw} height={sh} rx={SCREEN_R}
 fill="none"stroke="rgba(0,0,0,0.6)"strokeWidth="1.5"/>
 </svg>
 );
}

/* Side buttons (purely decorative SVG) */
function PhoneButtons() {
 return (
 <svg
 width={PHONE_W + 8} height={PHONE_H}
 style={{ position: "absolute", top: 0, left: -4, zIndex: 35, pointerEvents: "none"}}
 >
 <defs>
 <linearGradient id="btn-g"x1="0"y1="0"x2="4"y2="0"gradientUnits="userSpaceOnUse">
 <stop offset="0%"stopColor="#555560"/>
 <stop offset="50%"stopColor="#333340"/>
 <stop offset="100%"stopColor="#444450"/>
 </linearGradient>
 </defs>
 {/* Power button — right */}
 <rect x={PHONE_W + 4} y={Math.round(PHONE_H * 0.28)} width={4} height={52} rx={2} fill="url(#btn-g)"/>
 {/* Mute switch — left */}
 <rect x={0} y={Math.round(PHONE_H * 0.14)} width={4} height={26} rx={2} fill="url(#btn-g)"/>
 {/* Volume up — left */}
 <rect x={0} y={Math.round(PHONE_H * 0.23)} width={4} height={44} rx={2} fill="url(#btn-g)"/>
 {/* Volume down — left */}
 <rect x={0} y={Math.round(PHONE_H * 0.35)} width={4} height={44} rx={2} fill="url(#btn-g)"/>
 </svg>
 );
}

/* 
 ANIMATED GLOW BACKGROUND
 */
function GlowBackground({ progress }: { progress: MotionValue<number> }) {
 const opacity = useTransform(progress, [0, 0.3, 0.8], [0.4, 0.9, 1.0]);
 const scale = useTransform(progress, [0, 0.6], [0.8, 1.1]);
 return (
 <motion.div className="absolute inset-0 pointer-events-none"style={{ opacity }}>
 {/* Central violet glow */}
 <motion.div className="absolute"style={{
 scale,
 width: 600, height: 500,
 top: "50%", left: "50%",
 transform: "translate(-50%,-50%)",
 background: `radial-gradient(ellipse at center, ${ACCENT}22 0%, ${ACCENT}10 30%, transparent 70%)`,
 filter: "blur(20px)",
 }} />
 {/* Top-left accent */}
 <div className="absolute"style={{
 width: 300, height: 300, top: "10%", left: "15%",
 background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
 filter: "blur(15px)",
 }} />
 {/* Bottom-right accent */}
 <div className="absolute"style={{
 width: 250, height: 250, bottom: "15%", right: "15%",
 background: "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)",
 filter: "blur(12px)",
 }} />
 </motion.div>
 );
}

/* Speed streak lines */
function Streaks({ progress }: { progress: MotionValue<number> }) {
 const opacity = useTransform(progress, [0.02, 0.12, 0.55, 0.70], [0, 1, 1, 0]);
 return (
 <motion.div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center"style={{ opacity }}>
 {Array.from({ length: 11 }).map((_, i) => {
 const dist = Math.abs(i - 5);
 const yOff = (i - 5) * 20;
 const alpha = 0.30 - dist * 0.024;
 return (
 <div key={i} className="absolute w-full"style={{
 top: `calc(50% + ${yOff}px)`, height: 1,
 background: `linear-gradient(90deg, transparent, rgba(124,58,237,${alpha * 1.2}) 25%, rgba(167,139,250,${alpha * 1.8}) 50%, rgba(124,58,237,${alpha * 1.2}) 75%, transparent)`,
 }} />
 );
 })}
 </motion.div>
 );
}

/* 
 MAIN EXPORT — PhoneCardScroll
 */
export function PhoneCardScroll() {
 const containerRef = useRef<HTMLDivElement>(null);

 /* Scroll progress: 0 when section enters viewport top, 1 when it leaves */
 const { scrollYProgress } = useScroll({
 target: containerRef,
 offset: ["start start", "end end"],
 });

 /* Spring smoothing — adjust stiffness/damping for feel:
 Low stiffness + high damping = slow, cinematic float
 High stiffness + low damping = snappy, immediate response */
 const smooth = useSpring(scrollYProgress, { stiffness: 48, damping: 22, mass: 0.9 });

 /* Card transforms 
 The card starts large and below center.
 As scroll progresses to ~0.72, it:
 - scales from 1.0 → 0.36 (fit inside phone screen)
 - moves up: y from 140 → -22 (center on phone screen)
 - tilts in: rotateX 0 → 10 (3-D entry perspective)
 - tilts side: rotateY 0 → 0 (can add subtle side tilt if desired)
 - slight Z: feel of coming toward then into screen */
 const cardScale = useTransform(smooth, [0, 0.72], [1.0, 0.36]);
 const cardY = useTransform(smooth, [0, 0.72], [140, -22 ]);
 const cardX = useTransform(smooth, [0, 0.72], [0, 0 ]);
 const cardRotateX = useTransform(smooth, [0, 0.30, 0.72], [0, 14, 4]);
 const cardRotateY = useTransform(smooth, [0, 0.36, 0.72], [0, -6, 0]);
 const cardRotateZ = useTransform(smooth, [0, 0.72], [0, 0]);

 /* Card visible from the start, fades only after fully entering the phone */
 const cardOpacity = useTransform(smooth, [0, 0.80, 0.95], [1, 1, 0.85]);

 /* Phone transforms 
 Phone zooms in gently from 0.82→1.0 and slides up slightly */
 const phoneScale = useTransform(smooth, [0, 0.50], [0.82, 1.0]);
 const phoneY = useTransform(smooth, [0, 0.50], [40, 0 ]);
 const phoneOpacity = useTransform(smooth, [0, 0.08], [0, 1]);

 /* Scroll hint fades out quickly */
 const hintOpacity = useTransform(smooth, [0, 0.06], [1, 0]);

 return (
 /* Container must be tall enough for the scroll to feel meaningful */
 <div ref={containerRef} style={{ height: "260vh"}}>

 {/* Sticky viewport */}
 <div
 className="sticky top-0 h-screen overflow-hidden flex items-center justify-center"style={{ background: "#fafafa", perspective: 1200 }}
 >
 {/* Background glows + streaks */}
 <GlowBackground progress={smooth} />
 <Streaks progress={smooth} />

 {/* Vignette */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 110% 100% at 50% 50%, transparent 40%, rgba(230,230,230,0.75))"}} />

 {/* 
 PHONE — z-10 screen behind card, z-30 frame in front
 */}
 <motion.div
 className="absolute"style={{ scale: phoneScale, y: phoneY, opacity: phoneOpacity, zIndex: 10 }}
 >
 <div className="relative"style={{ width: PHONE_W, height: PHONE_H }}>

 {/* LAYER z-0: outer glow around phone */}
 <div className="absolute pointer-events-none"style={{
 inset: -20, zIndex: 0,
 background: `radial-gradient(ellipse at center, ${ACCENT}18 0%, transparent 65%)`,
 filter: "blur(8px)",
 }} />

 {/* LAYER z-10: phone screen — sits BEHIND the card */}
 <div
 className="absolute overflow-hidden"style={{
 inset: SCREEN_INSET,
 borderRadius: SCREEN_R,
 zIndex: 10,
 }}
 >
 <WalletScreen />
 </div>

 {/* LAYER z-30: SVG phone frame with transparent screen cutout.
 This overlaps the card (z-20), making the card appear
 to be inside the screen when their positions align. */}
 <PhoneFrameMask />

 {/* LAYER z-35: Side buttons */}
 <PhoneButtons />
 </div>
 </motion.div>

 {/* 
 ANIMATED CARD — z-20 (between screen z-10 and frame z-30)
 When card position overlaps the phone, the frame at z-30
 renders ON TOP, creating the depth illusion.
 */}
 <motion.div
 className="absolute"style={{
 zIndex: 20,
 scale: cardScale,
 x: cardX,
 y: cardY,
 rotateX: cardRotateX,
 rotateY: cardRotateY,
 rotateZ: cardRotateZ,
 opacity: cardOpacity,
 transformOrigin: "center center",
 transformStyle: "preserve-3d",
 }}
 >
 <PremiumCard />
 </motion.div>

 {/* Scroll hint */}
 <motion.div
 style={{ opacity: hintOpacity, zIndex: 40 }}
 className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5">
 <motion.div
 animate={{ y: [0, 8, 0] }}
 transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut"}}
 className="h-10 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"/>
 <p className="text-[10px] uppercase tracking-[4px]"style={{ color: "rgba(0,0,0,0.30)"}}>Scroll</p>
 </motion.div>
 </div>
 </div>
 );
}
