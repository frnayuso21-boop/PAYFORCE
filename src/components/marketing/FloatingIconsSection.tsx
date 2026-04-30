"use client";

import { motion } from "framer-motion";

/* SVG logos inline (sin CDN externo) */
function ApplePayLogo() {
 return (
 <svg viewBox="0 0 165 40"className="h-6 w-24"fill="currentColor">
 <path d="M31.1 7.6c-1.7 2-4.4 3.6-7.1 3.4-.3-2.7 1-5.5 2.6-7.3 1.7-2 4.7-3.5 7.1-3.6.3 2.8-.8 5.5-2.6 7.5zm2.5 4c-3.9-.2-7.3 2.2-9.1 2.2-1.9 0-4.7-2.1-7.8-2-4 .1-7.7 2.3-9.8 5.9-4.2 7.2-1.1 17.9 3 23.7 2 2.9 4.4 6.2 7.5 6.1 3-.1 4.2-2 7.8-2s4.7 2 7.8 1.9c3.2-.1 5.3-3 7.3-5.9 2.3-3.3 3.2-6.5 3.3-6.7-.1 0-6.3-2.4-6.4-9.6-.1-6 4.9-8.8 5.1-9-2.8-4.1-7.1-4.6-8.7-4.6z"/>
 <path d="M68.1 4.5h-8.7v22.6H63v-7.7h5.1c4.7 0 8-3.2 8-7.5s-3.3-7.4-8-7.4zm.7 11.5H63V7.9h5.8c3.2 0 5 1.7 5 4.1s-1.8 4-5 4zM90.4 20.1c-2.2 0-3.8 1.1-4.6 2.7h-.1v-2.5h-3.4v16.3h3.5v-6.4c0-2.7 1.2-4.2 3.5-4.2 2.2 0 3.4 1.4 3.4 4.1v6.5h3.5v-7c0-4.3-2.2-7.5-5.8-7.5zM104.8 36.9c1.7 0 3.2-.8 3.9-2.1h.1v2h3.3V20.3h-3.5v8.5c0 2.6-1.3 4-3.4 4-2 0-3.1-1.3-3.1-3.8v-8.7H98v9.3c0 4.2 2.1 7.3 6.8 7.3zM118.5 38.1c2.3 0 3.9-1.1 4.8-2.8h.1v2.5h3.4V20.3h-3.5v2.4h-.1c-.9-1.6-2.5-2.6-4.7-2.6-3.9 0-6.5 3.3-6.5 8.9s2.6 9.1 6.5 9.1zm1-14.7c2.2 0 3.8 1.9 3.8 5.6s-1.6 5.6-3.8 5.6c-2.3 0-3.8-2-3.8-5.6s1.5-5.6 3.8-5.6zM133 18.1c1.2 0 2.1-.9 2.1-2.1s-.9-2.1-2.1-2.1-2.1.9-2.1 2.1.9 2.1 2.1 2.1zm-1.7 18.6h3.5V20.3h-3.5v16.4zM143.5 36.9c3.7 0 6.2-2 6.5-5h-3.3c-.3 1.4-1.5 2.2-3.1 2.2-2.2 0-3.7-1.8-3.7-4.9 0-3.1 1.4-4.9 3.7-4.9 1.7 0 2.9.9 3.1 2.3h3.3c-.3-3.1-2.8-5.2-6.4-5.2-4.3 0-7.2 3.1-7.2 8.9s2.9 8.6 7.1 8.6zM165 27.5c-.1-4.5-3.1-7.4-7.3-7.4-4.5 0-7.4 3.2-7.4 9s2.8 8.9 7.5 8.9c3.6 0 6.3-2 7.1-5h-3.3c-.5 1.4-1.8 2.2-3.7 2.2-2.4 0-3.9-1.6-4-4.5h11.1v-3.2zm-11.1 1.3c.2-2.6 1.6-4.1 3.8-4.1s3.5 1.5 3.6 4.1h-7.4z"/>
 </svg>
 );
}

function GooglePayLogo() {
 return (
 <svg viewBox="0 0 80 32"className="h-6 w-20">
 <text x="0"y="24"fontFamily="'Product Sans', Arial, sans-serif"fontSize="24"fontWeight="500"fill="#5F6368">G</text>
 <text x="18"y="24"fontFamily="'Product Sans', Arial, sans-serif"fontSize="24"fontWeight="500">
 <tspan fill="#4285F4">o</tspan><tspan fill="#34A853">o</tspan><tspan fill="#FBBC05">g</tspan><tspan fill="#EA4335">l</tspan><tspan fill="#4285F4">e</tspan>
 </text>
 <text x="0"y="24"fontFamily="'Product Sans', Arial, sans-serif"fontSize="14"fill="#5F6368"dy="0">
 </text>
 </svg>
 );
}

function VisaLogo() {
 return (
 <svg viewBox="0 0 100 32"className="h-5 w-16">
 <text x="2"y="26"fontFamily="'Helvetica Neue', Arial, sans-serif"fontSize="28"fontWeight="700"fill="#1A1F71"letterSpacing="-1">VISA</text>
 </svg>
 );
}

function MastercardLogo() {
 return (
 <svg viewBox="0 0 52 32"className="h-7 w-12">
 <circle cx="18"cy="16"r="14"fill="#EB001B"/>
 <circle cx="34"cy="16"r="14"fill="#F79E1B"/>
 <path d="M26 5.3a14 14 0 0 1 0 21.4A14 14 0 0 1 26 5.3z"fill="#FF5F00"/>
 </svg>
 );
}

function BizumLogo() {
 return (
 <svg viewBox="0 0 80 32"className="h-6 w-16">
 <rect width="80"height="32"rx="6"fill="#00ADEF"opacity="0"/>
 <text x="4"y="24"fontFamily="'Helvetica Neue', Arial, sans-serif"fontSize="22"fontWeight="800"fill="#00ADEF"letterSpacing="-0.5">bizum</text>
 </svg>
 );
}

function ShopifyLogo() {
 return (
 <svg viewBox="0 0 80 32"className="h-6 w-20">
 <text x="0"y="24"fontFamily="'Helvetica Neue', Arial, sans-serif"fontSize="22"fontWeight="700"fill="#96BF48">shopify</text>
 </svg>
 );
}

/* Tarjeta PayForce estilo Mastercard */
function PayForceCard() {
 return (
 <div className="relative overflow-hidden rounded-2xl"style={{
 width: 200, height: 126,
 background: "linear-gradient(135deg, #1a0533 0%, #2d1060 50%, #0f0a1a 100%)",
 boxShadow: "0 20px 60px rgba(124,58,237,0.45), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
 }}>
 {/* Brillo interior */}
 <div className="absolute inset-0"style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)"}}/>
 {/* Glow círculo */}
 <div className="absolute -right-4 -bottom-4 rounded-full"style={{ width: 100, height: 100, background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)"}}/>

 {/* Logo + nombre */}
 <div className="absolute top-3.5 left-4 flex items-center gap-1.5">
 <svg viewBox="0 0 18 18"width="12"height="12"fill="none">
 <polygon points="9,1 16.5,5 16.5,13 9,17 1.5,13 1.5,5"fill="rgba(255,255,255,0.25)"stroke="rgba(255,255,255,0.45)"strokeWidth="1"/>
 </svg>
 <span className="text-[8px] font-semibold tracking-[2.5px] text-white/50 uppercase">PayForce</span>
 </div>

 {/* Círculos Mastercard */}
 <div className="absolute top-3 right-3.5 flex">
 <div className="h-7 w-7 rounded-full"style={{ background: "#EB001B", opacity: 0.85 }}/>
 <div className="h-7 w-7 rounded-full -ml-3"style={{ background: "#F79E1B", opacity: 0.85 }}/>
 </div>

 {/* Chip */}
 <div className="absolute left-4"style={{ top: 42 }}>
 <div className="rounded"style={{ width: 22, height: 16,
 background: "linear-gradient(135deg,#d4a843 0%,#f0d080 40%,#c9953a 100%)",
 boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.3)"}}>
 <div style={{ position:"absolute",left:7,top:0,bottom:0,width:0.5,background:"rgba(0,0,0,0.2)"}}/>
 <div style={{ position:"absolute",top:6,left:0,right:0,height:0.5,background:"rgba(0,0,0,0.15)"}}/>
 </div>
 </div>

 {/* Número */}
 <div className="absolute bottom-7 left-4 text-[7px] tracking-[2.5px] text-white/30 font-mono">
 •••• •••• •••• 4291
 </div>

 {/* Nombre + red */}
 <div className="absolute bottom-2.5 left-4 right-4 flex items-end justify-between">
 <span className="text-[6px] tracking-widest text-white/20 uppercase">PayForce User</span>
 <span className="text-[6px] text-white/20">05/28</span>
 </div>
 </div>
 );
}

/* Píldora de método de pago */
interface PillProps {
 logo: React.ReactNode;
 label: string;
 x: string;
 y: string;
 delay: number;
 rotate: number;
}

function FloatingPill({ logo, label, x, y, delay, rotate }: PillProps) {
 return (
 <motion.div
 className="absolute z-20"style={{ left: x, top: y, transform: "translate(-50%,-50%)"}}
 initial={{ opacity: 0, scale: 0.5, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 transition={{ delay, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
 >
 <motion.div
 animate={{ y: [0, -8, 0], rotate: [rotate, rotate + 1.2, rotate] }}
 transition={{ duration: 3.5 + delay * 0.7, repeat: Infinity, ease: "easeInOut", delay: delay * 0.4 }}
 className="flex items-center gap-2.5 rounded-2xl px-4 py-2.5"style={{
 background: "rgba(255,255,255,0.96)",
 backdropFilter: "blur(20px)",
 boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
 border: "1px solid rgba(0,0,0,0.05)",
 }}
 >
 <div className="flex items-center justify-center"style={{ minWidth: 32 }}>
 {logo}
 </div>
 <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{label}</span>
 </motion.div>
 </motion.div>
 );
}

/* Tarjeta PayForce flotante */
function FloatingCard({ x, y, delay }: { x: string; y: string; delay: number }) {
 return (
 <motion.div
 className="absolute z-20"style={{ left: x, top: y, transform: "translate(-50%,-50%)"}}
 initial={{ opacity: 0, scale: 0.5, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 transition={{ delay, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
 >
 <motion.div
 animate={{ y: [0, -10, 0], rotate: [-4, -2.5, -4] }}
 transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut"}}
 >
 <PayForceCard />
 </motion.div>
 </motion.div>
 );
}

/* Card checkout central */
function CheckoutCard() {
 return (
 <div className="relative rounded-2xl overflow-hidden"style={{
 width: 280,
 background: "rgba(255,255,255,0.04)",
 border: "1px solid rgba(255,255,255,0.10)",
 backdropFilter: "blur(24px)",
 boxShadow: "0 32px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.06) inset",
 }}>
 {/* Header */}
 <div className="px-5 pt-5 pb-4"style={{ borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
 <p className="text-[10px] tracking-[2px] uppercase text-white/30 mb-1">PayForce · Checkout</p>
 <p className="text-[26px] text-white leading-none"style={{ fontWeight: 300, letterSpacing: "-0.02em"}}>€ 149,00</p>
 <p className="text-[11px] text-white/30 mt-1">Plan Pro · mensual</p>
 </div>

 {/* Métodos */}
 <div className="px-5 py-4 flex flex-col gap-2">
 {[
 { label: "Apple Pay", active: true, icon: ""},
 { label: "Tarjeta", active: false, icon: ""},
 { label: "Bizum", active: false, icon: ""},
 ].map(m => (
 <div key={m.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5"style={{
 background: m.active ? "rgba(124,58,237,0.18)": "rgba(255,255,255,0.04)",
 border: m.active ? "1px solid rgba(124,58,237,0.40)": "1px solid rgba(255,255,255,0.06)",
 }}>
 <span className="text-sm">{m.icon}</span>
 <span className="text-[12px] text-white/70">{m.label}</span>
 {m.active && <div className="ml-auto h-2 w-2 rounded-full bg-white"/>}
 </div>
 ))}
 </div>

 {/* Botón */}
 <div className="px-5 pb-5">
 <div className="w-full rounded-xl py-3 text-center text-[12px] font-medium text-white"style={{ background: "#ffffff", color: "#111111", boxShadow: "0 4px 16px rgba(0,0,0,0.25)"}}>
 Pagar con Apple Pay
 </div>
 <p className="text-center text-[10px] text-white/20 mt-3"> Pago seguro · PayForce</p>
 </div>
 </div>
 );
}

/* Sección principal */
export function FloatingIconsSection() {
 const pills: PillProps[] = [
 { logo: <ApplePayLogo />, label: "Apple Pay", x: "10%", y: "14%", delay: 0.10, rotate: -5 },
 { logo: <GooglePayLogo />, label: "Google Pay", x: "88%", y: "14%", delay: 0.18, rotate: 4 },
 { logo: <VisaLogo />, label: "Visa", x: "7%", y: "58%", delay: 0.26, rotate: 3 },
 { logo: <MastercardLogo />, label: "Mastercard", x: "90%", y: "56%", delay: 0.34, rotate: -4 },
 { logo: <BizumLogo />, label: "Bizum", x: "12%", y: "88%", delay: 0.42, rotate: 5 },
 { logo: <ShopifyLogo />, label: "Shopify", x: "86%", y: "88%", delay: 0.50, rotate: -3 },
 ];

 const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

 return (
 <section
 className="relative overflow-hidden px-4 py-24 md:px-8 mx-4 md:mx-8"style={{
 background: "linear-gradient(135deg, #04020e 0%, #1a0b38 38%, #0d1c38 65%, #05091c 100%)",
 borderRadius: 48,
 }}
 >

 {/* 2. Grano fino */}
 <div className="pointer-events-none absolute inset-0 opacity-[0.16]"style={{ backgroundImage: NOISE, backgroundSize: "160px", mixBlendMode: "soft-light"}} />

 {/* 3. Glow violeta vibrante — top-right */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 55% 45% at 90% 8%, rgba(130,50,255,0.55) 0%, transparent 58%)"}} />

 {/* 4. Glow indigo — bottom-left */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 50% 45% at 6% 92%, rgba(50,80,230,0.35) 0%, transparent 55%)"}} />

 {/* 5. Aurora central */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 130% 40% at 50% 50%, rgba(100,40,200,0.13) 0%, transparent 70%)"}} />

 {/* 6. Teal accent top-center */}
 <div className="pointer-events-none absolute inset-0"style={{ background: "radial-gradient(ellipse 60% 28% at 50% 0%, rgba(13,210,185,0.08) 0%, transparent 65%)"}} />

 <div className="relative z-10 mb-12 text-center px-4 md:mb-16 md:px-6">
 <p className="mb-4 text-[10px] uppercase tracking-[3px] md:text-[11px] md:tracking-[4px]"style={{ color: "rgba(255,255,255,0.30)"}}>Métodos de pago</p>
 <h2 className="text-[30px] tracking-tight text-white leading-tight md:text-[54px]"style={{ fontWeight: 400, letterSpacing: "-0.025em"}}>
 Todos los métodos.<br />
 <span style={{ color: "rgba(255,255,255,0.22)"}}>Un solo checkout.</span>
 </h2>
 <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed md:mt-5 md:text-[17px]"style={{ color: "rgba(255,255,255,0.42)"}}>
 Apple Pay, Google Pay, Visa, Mastercard, Bizum y más — en un checkout
 unificado, sin configuración adicional.
 </p>
 </div>

 {/* Área: checkout card + píldoras + tarjeta */}
 <div className="relative mx-auto"style={{ maxWidth: 760, height: 580 }}>

 {/* Checkout card */}
 <motion.div
 className="absolute left-1/2 -translate-x-1/2 z-10"style={{ top: 80 }}
 initial={{ opacity: 0, y: 30, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
 >
 <CheckoutCard />
 </motion.div>

 {/* Tarjeta PayForce Mastercard flotante — arriba a la derecha del iPhone */}
 <FloatingCard x="72%"y="22%"delay={0.6} />

 </div>
 </section>
 );
}
