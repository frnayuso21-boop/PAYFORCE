"use client";
import { useState } from "react";

/* datos del gráfico */
const SERIES = [
 { day: "Lun", val: 24, amt: "€11.200"},
 { day: "Mar", val: 58, amt: "€27.400"},
 { day: "Mié", val: 41, amt: "€19.300"},
 { day: "Jue", val: 79, amt: "€37.800"},
 { day: "Vie", val: 63, amt: "€29.900"},
 { day: "Sáb", val: 52, amt: "€24.700"},
 { day: "Hoy", val: 100, amt: "€48.290"},
];

const W = 560; const H = 80;
const pL = 6; const pR = 6; const pT = 10; const pB = 18;
const cW = W - pL - pR; const cH = H - pT - pB;
const n = SERIES.length;
const xs = SERIES.map((_, i) => pL + (i / (n - 1)) * cW);
const ys = SERIES.map(s => pT + cH - (s.val / 100) * cH);
const curve = xs.map((x, i) => {
 if (i === 0) return `M ${x} ${ys[i]}`;
 const dx = (xs[i] - xs[i - 1]) * 0.45;
 return `C ${xs[i-1]+dx} ${ys[i-1]}, ${x-dx} ${ys[i]}, ${x} ${ys[i]}`;
}).join("");
const area = curve + `L ${xs[n-1]} ${pT+cH} L ${xs[0]} ${pT+cH} Z`;

/* pagos recientes */
const PAYMENTS = [
 { name: "Arista Móvil S.L.", amount: "€1.200,00", status: "Completado", ok: true, date: "hoy 14:32"},
 { name: "TechStartup GmbH", amount: "€450,00", status: "Completado", ok: true, date: "hoy 13:05"},
 { name: "Global Store Inc.", amount: "€3.400,00", status: "Procesando", ok: false, date: "hoy 11:48"},
 { name: "Marta García", amount: "€220,00", status: "Completado", ok: true, date: "ayer 18:20"},
];

/* nav */
const NAV = [
 { icon: "⊞", label: "Inicio", active: true },
 { icon: "↑↓", label: "Transacciones", active: false },
 { icon: "", label: "TITAN 1.4.1", active: false },
 { icon: "", label: "Payment Links",active: false },
 { icon: "", label: "Facturas", active: false },
 { icon: "", label: "Ajustes", active: false },
];

export function DashboardOverviewClient() {
 const [hovered, setHovered] = useState<number | null>(null);

 return (
 <div
 className="w-full overflow-hidden flex"style={{
 background: "#f8fafc",
 minHeight: 480,
 fontFamily: "system-ui, -apple-system, sans-serif",
 borderRadius: "48px",
 boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
 }}
 >
 {/* SIDEBAR */}
 <div
 className="flex flex-col shrink-0 py-4 px-2.5 gap-0.5"style={{ width: 148, background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.06)"}}
 >
 {/* Logo */}
 <div className="flex items-center gap-2 px-2 mb-5">
 <div
 className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}}
 >P</div>
 <span className="text-[11px] font-semibold"style={{ color: "rgba(255,255,255,0.80)"}}>PayForce</span>
 </div>

 {/* Sección COBROS */}
 <p className="px-2 text-[8px] font-bold uppercase tracking-widest mb-1"style={{ color: "rgba(255,255,255,0.22)"}}>
 Cobros
 </p>
 {NAV.map(nav => (
 <div
 key={nav.label}
 className="flex items-center gap-2 rounded-lg px-2 py-1.5"style={{
 background: nav.active ? "rgba(99,102,241,0.18)": "transparent",
 color: nav.active ? "#a5b4fc": "rgba(255,255,255,0.38)",
 }}
 >
 <span className="text-[10px] shrink-0">{nav.icon}</span>
 <span className="text-[9.5px] font-medium truncate">{nav.label}</span>
 {nav.label === "Facturas"&& (
 <span className="ml-auto text-[7px] font-bold rounded px-1 py-0.5"style={{ background: "rgba(99,102,241,0.25)", color: "#a5b4fc"}}>N</span>
 )}
 </div>
 ))}

 {/* TITAN badge */}
 <div
 className="mt-auto mx-1 rounded-xl p-2.5"style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)"}}
 >
 <div className="flex items-center gap-1.5 mb-1">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>
 <p className="text-[8px] font-bold text-purple-400">TITAN 1.4.1</p>
 </div>
 <p className="text-[7px]"style={{ color: "rgba(255,255,255,0.28)"}}>Sin alertas activas</p>
 <div className="h-1 w-full rounded-full mt-2"style={{ background: "rgba(255,255,255,0.08)"}}>
 <div className="h-1 rounded-full"style={{ width: "12%", background: "#4ade80"}} />
 </div>
 <p className="text-[7px] mt-1"style={{ color: "rgba(255,255,255,0.22)"}}>Riesgo: nominal</p>
 </div>
 </div>

 {/* CONTENIDO PRINCIPAL */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

 {/* Topbar */}
 <div
 className="flex items-center justify-between px-5 py-3 shrink-0"style={{ borderBottom: "1px solid #e8ecf1", background: "#ffffff"}}
 >
 <div>
 <div className="flex items-center gap-2">
 <p className="text-[13px] font-bold text-slate-900">Dashboard</p>
 <span className="text-[8px] rounded-full px-2 py-0.5 font-semibold"style={{ background: "#f0fdf4", color: "#15803d"}}>Live</span>
 </div>
 <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"/>
 Datos reales · Abr 2026
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[9px] rounded-full px-2.5 py-1 text-slate-500"style={{ border: "1px solid #e2e8f0"}}>Exportar</span>
 <span className="text-[9px] rounded-full px-2.5 py-1 text-white font-bold"style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)"}}>+ Nuevo cobro</span>
 </div>
 </div>

 <div className="p-3 flex flex-col gap-2.5 overflow-hidden flex-1">

 {/* KPIs */}
 <div className="grid grid-cols-4 gap-2">
 {[
 { label: "Volumen del mes", value: "€48.290", sub: "3.841 transacciones", trend: "+12%", up: true },
 { label: "Transacciones", value: "3.841", sub: "0 totales", trend: "+8%", up: true },
 { label: "Fees PayForce", value: "€1.932", sub: "4% + €0,40 por tx", trend: "+11%", up: true },
 { label: "Balance disponible", value: "€12.480", sub: "+€2.100 pendiente", trend: "libre", up: false },
 ].map(k => (
 <div key={k.label} className="rounded-xl p-2.5 bg-white"style={{ border: "1px solid #f1f5f9"}}>
 <p className="text-[8px] text-slate-400 truncate uppercase tracking-wide">{k.label}</p>
 <p className="text-[13px] font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{k.value}</p>
 <div className="flex items-center justify-between mt-0.5">
 <p className="text-[7.5px] text-slate-400 truncate">{k.sub}</p>
 <span className="text-[7.5px] font-bold shrink-0 ml-1"style={{ color: k.up ? "#16a34a": "#6366f1"}}>{k.trend}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Gráfico + Cuenta cobros */}
 <div className="grid gap-2"style={{ gridTemplateColumns: "1fr 180px"}}>

 {/* Gráfico */}
 <div className="rounded-xl p-3 bg-white"style={{ border: "1px solid #f1f5f9"}}>
 <div className="flex items-center justify-between mb-2">
 <div>
 <p className="text-[10px] font-semibold text-slate-800">Actividad de ingresos</p>
 <p className="text-[8px] text-slate-400">Últimos 7 días · se actualiza en tiempo real</p>
 </div>
 <div className="flex items-center gap-1">
 <span className="relative flex h-1.5 w-1.5">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>
 <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"/>
 </span>
 <span className="text-[8px] text-slate-400">Live</span>
 <span className="ml-2 text-[8px] font-bold text-emerald-600"> +18.3%</span>
 </div>
 </div>

 <div className="relative select-none">
 <svg
 width="100%"viewBox={`0 0 ${W} ${H}`}
 style={{ display: "block", overflow: "visible", cursor: "crosshair"}}
 onMouseLeave={() => setHovered(null)}
 >
 <defs>
 <linearGradient id="ov-line"x1="0"y1="0"x2="1"y2="0">
 <stop offset="0%"stopColor="#6366f1"/><stop offset="100%"stopColor="#8b5cf6"/>
 </linearGradient>
 <linearGradient id="ov-area"x1="0"y1="0"x2="0"y2="1">
 <stop offset="0%"stopColor="#6366f1"stopOpacity="0.15"/><stop offset="100%"stopColor="#6366f1"stopOpacity="0"/>
 </linearGradient>
 </defs>
 <path d={area} fill="url(#ov-area)"/>
 <path d={curve} fill="none"stroke="url(#ov-line)"strokeWidth="2"strokeLinecap="round"/>
 {hovered !== null && (
 <line x1={xs[hovered]} y1={pT - 4} x2={xs[hovered]} y2={pT + cH}
 stroke="#6366f1"strokeWidth="1"strokeDasharray="3 3"opacity="0.4"/>
 )}
 {SERIES.map((s, i) => (
 <g key={s.day}>
 <rect x={xs[i]-18} y={pT-4} width={36} height={cH+4} fill="transparent"onMouseEnter={() => setHovered(i)} />
 <text x={xs[i]} y={H-1} textAnchor="middle"fontSize="7"fontFamily="system-ui"fill={i === n-1 || hovered === i ? "#6366f1": "#94a3b8"}
 fontWeight={i === n-1 || hovered === i ? "700": "400"}>
 {s.day}
 </text>
 <circle cx={xs[i]} cy={ys[i]} r={hovered === i ? 4.5 : i === n-1 ? 3.5 : 0}
 fill="#6366f1"stroke="white"strokeWidth="2"style={{ transition: "r 0.12s"}} />
 </g>
 ))}
 </svg>

 {hovered !== null && (
 <div
 className="pointer-events-none absolute z-10"style={{
 bottom: `calc(100% - ${(ys[hovered]/H)*100}% + 18px)`,
 left: xs[hovered]/W > 0.82 ? "auto": `max(0px, calc(${(xs[hovered]/W)*100}% - 44px))`,
 right: xs[hovered]/W > 0.82 ? 0 : "auto",
 }}
 >
 <div className="rounded-lg px-2.5 py-1.5 shadow-xl"style={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)", whiteSpace: "nowrap"}}>
 <p className="text-[11px] font-bold text-white">{SERIES[hovered].amt}</p>
 <p className="text-[9px] text-slate-400">{SERIES[hovered].day} · Abr 2026</p>
 </div>
 <div style={{ width:0,height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:"5px solid #0f172a", marginLeft:12 }} />
 </div>
 )}
 </div>
 </div>

 {/* Cuenta de cobros */}
 <div className="rounded-xl p-3 bg-white flex flex-col gap-2"style={{ border: "1px solid #f1f5f9"}}>
 <p className="text-[10px] font-semibold text-slate-800">Cuenta de cobros</p>
 <p className="text-[8.5px] text-slate-500 truncate">franayuso@gmail.com</p>
 <div className="rounded-lg px-2 py-1.5"style={{ background: "#fffbeb", border: "1px solid #fde68a"}}>
 <p className="text-[8px] font-semibold text-amber-700"> Verificación pendiente</p>
 </div>
 <div className="flex flex-col gap-1.5 mt-1">
 {[
 { label: "Cobros habilitados", ok: false },
 { label: "Pagos habilitados", ok: false },
 { label: "Identidad verificada", ok: false },
 ].map(item => (
 <div key={item.label} className="flex items-center justify-between">
 <span className="text-[8px] text-slate-500">{item.label}</span>
 <span className="text-[7.5px] font-semibold"style={{ color: item.ok ? "#16a34a": "#94a3b8"}}>
 {item.ok ? "Activo": "Inactivo"}
 </span>
 </div>
 ))}
 </div>
 <button className="mt-auto w-full rounded-lg py-1.5 text-[8.5px] font-bold text-white"style={{ background: "#0f172a"}}>
 Completar verificación →
 </button>
 </div>
 </div>

 {/* Pagos recientes */}
 <div className="rounded-xl bg-white overflow-hidden"style={{ border: "1px solid #f1f5f9"}}>
 <div className="flex items-center justify-between px-3 py-2"style={{ borderBottom: "1px solid #f1f5f9"}}>
 <p className="text-[10px] font-semibold text-slate-800">Pagos recientes</p>
 <div className="flex items-center gap-2">
 <span className="text-[8px] text-slate-400">8 resultados · refresco cada 5s</span>
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
 </div>
 </div>
 <div>
 {/* Cabecera tabla */}
 <div className="grid px-3 py-1"style={{ gridTemplateColumns: "80px 1fr 70px 60px 50px", borderBottom: "1px solid #f8fafc"}}>
 {["Estado","Descripción","Importe","Fee","Fecha"].map(h => (
 <span key={h} className="text-[7.5px] font-semibold uppercase tracking-wider text-slate-400">{h}</span>
 ))}
 </div>
 {PAYMENTS.map((p, i) => (
 <div key={i} className="grid items-center px-3 py-1.5"style={{ gridTemplateColumns: "80px 1fr 70px 60px 50px", borderTop: i > 0 ? "1px solid #f8fafc": "none"}}>
 <div className="flex items-center gap-1">
 <div className="h-1.5 w-1.5 rounded-full shrink-0"style={{ background: p.ok ? "#22c55e": "#3b82f6"}} />
 <span className="text-[8px] rounded-full px-1.5 py-0.5 font-medium"style={{ background: p.ok ? "#f0fdf4": "#eff6ff", color: p.ok ? "#15803d": "#1d4ed8"}}>
 {p.status}
 </span>
 </div>
 <span className="text-[8.5px] text-slate-600 truncate pr-2">{p.name}</span>
 <span className="text-[8.5px] font-bold text-slate-900 tabular-nums"style={{ textDecoration: !p.ok ? "line-through": "none", color: !p.ok ? "#94a3b8": "#0f172a"}}>
 {p.amount}
 </span>
 <span className="text-[8px] text-slate-400">{p.ok ? "€50,00": "—"}</span>
 <span className="text-[7.5px] text-slate-400">{p.date}</span>
 </div>
 ))}
 </div>
 </div>

 </div>
 </div>
 </div>
 );
}
