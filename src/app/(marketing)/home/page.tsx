import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, CreditCard, RefreshCw, Link2, BarChart3,
  Shield, Zap, Globe, Check, Star,
  TrendingUp, TrendingDown, Clock, CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PayForce — La infraestructura de pagos para tu negocio",
  description:
    "Acepta pagos online, gestiona suscripciones y controla tus finanzas en un solo lugar. Sin complicaciones.",
};

// ─── Tokens de diseño ─────────────────────────────────────────────────────────
const C = {
  blue:    "#2563EB",
  blueSoft:"#EFF6FF",
  dark:    "#0A2540",
  muted:   "#425466",
  border:  "#E3E8EF",
  bg:      "#F6F9FC",
  green:   "#0D9488",
  red:     "#DC2626",
};

// ─── Datos mock ───────────────────────────────────────────────────────────────
const TRUST_LOGOS = [
  "Santander", "BBVA", "Telefónica", "Endesa", "Mapfre", "Iberia",
];

const TESTIMONIALS = [
  {
    name:    "Carlos Moreno",
    role:    "CEO, Venta Online SL",
    avatar:  "CM",
    text:    "Pasamos de 3 días de integración a 3 horas. PayForce es lo que debería haber existido siempre.",
    rating:  5,
  },
  {
    name:    "Sara Vidal",
    role:    "CTO, SaaS Fintech",
    avatar:  "SV",
    text:    "Las suscripciones con cobro variable para energía eran imposibles antes. Ahora las gestionamos en minutos.",
    rating:  5,
  },
  {
    name:    "Miguel Torres",
    role:    "Founder, Marketplace B2B",
    avatar:  "MT",
    text:    "Connect nos permitió montar un marketplace multi-vendedor en una semana. Increíble.",
    rating:  5,
  },
];

const TRANSACTIONS = [
  { name: "Ana García",    amount: "1.250,00 €", method: "Visa",       status: "success", time: "hace 2m"  },
  { name: "Tech SL",       amount: "3.890,00 €", method: "Mastercard", status: "success", time: "hace 8m"  },
  { name: "Pedro Ruiz",    amount: "450,00 €",   method: "Apple Pay",  status: "pending", time: "hace 15m" },
  { name: "Marta López",   amount: "225,00 €",   method: "Visa",       status: "success", time: "hace 31m" },
  { name: "Global Corp",   amount: "12.400,00 €",method: "Transferencia",status:"success", time: "hace 1h" },
];

const PRODUCTS = [
  {
    tag:   "Pagos online",
    icon:  CreditCard,
    color: C.blue,
    title: "Acepta cualquier método de pago",
    desc:  "Tarjeta, Apple Pay, Google Pay, Bizum y transferencias bancarias. Una integración, todos los métodos. Tus clientes pagan como quieren.",
    features: [
      "Checkout optimizado para conversión",
      "3D Secure automático",
      "Pagos recurrentes y únicos",
      "Prevención de fraude incluida",
    ],
    cta:   "Ver documentación",
    href:  "/solutions",
    flip:  false,
  },
  {
    tag:   "Suscripciones",
    icon:  RefreshCw,
    color: "#0D9488",
    title: "Facturación recurrente flexible",
    desc:  "Desde suscripciones fijas hasta cobros variables por uso. Perfectos para SaaS, energía o servicios con precios dinámicos.",
    features: [
      "Precios fijos y variables",
      "Texto en extractos personalizable",
      "Retry inteligente en fallos",
      "Portal de cliente self-service",
    ],
    cta:   "Explorar suscripciones",
    href:  "/solutions",
    flip:  true,
  },
  {
    tag:   "Payment Links",
    icon:  Link2,
    color: "#7C3AED",
    title: "Cobra en segundos, sin código",
    desc:  "Crea un enlace de pago en 30 segundos y compártelo por WhatsApp, email o QR. Sin página web, sin desarrollo.",
    features: [
      "Link listo en 30 segundos",
      "Comparte por WhatsApp o QR",
      "Con tu logo y colores",
      "Expira cuando tú quieras",
    ],
    cta:   "Crear tu primer link",
    href:  "/signup",
    flip:  false,
  },
  {
    tag:   "Dashboard financiero",
    icon:  BarChart3,
    color: "#F59E0B",
    title: "Control total de tus finanzas",
    desc:  "Volumen, conversión, disputas y payouts en una sola pantalla. Datos en tiempo real, exportables a contabilidad.",
    features: [
      "Análisis en tiempo real",
      "Exportación CSV/PDF",
      "Alertas inteligentes",
      "Acceso para tu equipo",
    ],
    cta:   "Ver el dashboard",
    href:  "/signup",
    flip:  true,
  },
];

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Completado
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pendiente
    </span>
  );
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-16 md:pt-40 md:pb-24">
      {/* Grid sutil */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${C.border} 1px, transparent 1px),
            linear-gradient(90deg, ${C.border} 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)",
          opacity: 0.5,
        }} />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-medium"
          style={{ borderColor: C.border, color: C.blue, background: C.blueSoft }}>
          <Zap className="h-3 w-3" />
          Nuevo · Payouts instantáneos disponibles
          <ArrowRight className="h-3 w-3 opacity-60" />
        </div>

        {/* Headline */}
        <h1 className="text-[44px] md:text-[72px] leading-[1.08] tracking-[-2px] font-semibold"
          style={{ color: C.dark }}>
          La infraestructura de pagos
          <br />
          <span style={{ color: C.blue }}>para tu negocio</span>
        </h1>

        {/* Sub */}
        <p className="mx-auto mt-6 max-w-[540px] text-[18px] leading-relaxed"
          style={{ color: C.muted }}>
          Acepta pagos, gestiona suscripciones y controla tus finanzas en un solo lugar.
          Sin complicaciones, sin código complejo.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup"
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-medium text-white transition-all hover:opacity-90"
            style={{ background: C.blue, boxShadow: `0 1px 4px ${C.blue}40` }}>
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/solutions"
            className="flex items-center gap-2 rounded-lg border px-6 py-3 text-[15px] font-medium transition-all hover:bg-slate-50"
            style={{ borderColor: C.border, color: C.dark }}>
            Ver soluciones
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-[12px]" style={{ color: C.muted }}>
          Sin tarjeta de crédito · Cancela cuando quieras · PCI DSS compliant
        </p>

        {/* Dashboard mockup */}
        <div className="mt-14 relative mx-auto max-w-4xl">
          <div className="rounded-2xl border bg-white overflow-hidden"
            style={{
              borderColor: C.border,
              boxShadow: "0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
            }}>
            {/* Topbar del mockup */}
            <div className="flex items-center gap-1.5 border-b px-4 py-3"
              style={{ borderColor: C.border, background: "#F8FAFC" }}>
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[11px] text-slate-400">app.payforce.co/dashboard</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 divide-x" style={{ borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: "Cobrado hoy",   value: "8.420 €",   trend: "+12%", up: true  },
                { label: "Este mes",      value: "94.730 €",  trend: "+8%",  up: true  },
                { label: "Ticket medio",  value: "347 €",     trend: "+3%",  up: true  },
                { label: "Tasa de éxito", value: "98,4%",     trend: "-0.2%",up: false },
              ].map((k) => (
                <div key={k.label} className="px-5 py-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
                  <p className="text-[22px] font-normal tabular-nums" style={{ color: C.dark }}>{k.value}</p>
                  <span className={`flex items-center gap-1 text-[11px] mt-0.5 ${k.up ? "text-emerald-600" : "text-red-500"}`}>
                    {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {k.trend} vs mes anterior
                  </span>
                </div>
              ))}
            </div>

            {/* Chart + Transactions */}
            <div className="grid md:grid-cols-[1fr_340px]" style={{ borderBottom: `1px solid ${C.border}` }}>
              {/* Mini bar chart */}
              <div className="p-5 border-r" style={{ borderColor: C.border }}>
                <p className="text-[12px] font-medium mb-4" style={{ color: C.dark }}>Volumen últimos 14 días</p>
                <div className="flex items-end gap-1.5 h-24">
                  {[30,45,28,60,75,55,80,65,90,70,85,50,95,88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background: h > 80 ? C.blue : "#E2E8F0",
                      }} />
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div className="p-5">
                <p className="text-[12px] font-medium mb-3" style={{ color: C.dark }}>Recientes</p>
                <div className="space-y-2.5">
                  {TRANSACTIONS.slice(0, 4).map((t) => (
                    <div key={t.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-semibold text-slate-600">
                          {t.name[0]}
                        </div>
                        <span style={{ color: C.dark }}>{t.name}</span>
                      </div>
                      <span className="font-medium tabular-nums" style={{ color: C.dark }}>{t.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-20 blur-3xl opacity-20 rounded-full"
            style={{ background: C.blue }} />
        </div>
      </div>
    </section>
  );
}

function ProductSections() {
  return (
    <section className="py-24" style={{ background: "#F6F9FC" }}>
      <div className="mx-auto max-w-5xl px-6 space-y-32">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.tag}
              className={`flex flex-col gap-12 md:gap-20 items-center ${
                p.flip ? "md:flex-row-reverse" : "md:flex-row"
              }`}>
              {/* Texto */}
              <div className="flex-1 space-y-5">
                <Tag color={p.color} label={p.tag} />
                <h2 className="text-[32px] md:text-[40px] leading-tight font-semibold tracking-tight"
                  style={{ color: C.dark }}>
                  {p.title}
                </h2>
                <p className="text-[16px] leading-relaxed" style={{ color: C.muted }}>
                  {p.desc}
                </p>
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: C.muted }}>
                      <Check className="h-4 w-4 shrink-0" style={{ color: p.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-opacity hover:opacity-75"
                  style={{ color: p.color }}>
                  {p.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Card ilustración */}
              <div className="flex-1 w-full">
                <div className="rounded-2xl border bg-white p-6 shadow-sm"
                  style={{ borderColor: C.border }}>
                  {/* Header de la card */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${p.color}12`, border: `1px solid ${p.color}20` }}>
                      <Icon className="h-4.5 w-4.5" style={{ color: p.color }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: C.dark }}>{p.tag}</p>
                      <p className="text-[11px]" style={{ color: C.muted }}>PayForce</p>
                    </div>
                  </div>

                  {/* Contenido dinámico según producto */}
                  {p.tag === "Pagos online" && (
                    <div className="space-y-3">
                      <div className="rounded-xl border p-4" style={{ borderColor: C.border, background: C.bg }}>
                        <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide">Métodos activos</p>
                        <div className="flex flex-wrap gap-2">
                          {["Visa", "Mastercard", "Apple Pay", "Google Pay", "Bizum", "SEPA"].map((m) => (
                            <span key={m} className="rounded-lg border px-2.5 py-1 text-[11px] font-medium"
                              style={{ borderColor: C.border, color: C.dark }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[13px]">
                        <span style={{ color: C.muted }}>Conversión</span>
                        <span className="font-medium text-emerald-600">+18% vs anterior</span>
                      </div>
                    </div>
                  )}

                  {p.tag === "Suscripciones" && (
                    <div className="space-y-2.5">
                      {[
                        { name: "Plan Pro",   amount: "49 €/mes",  status: "Activa",  count: 847 },
                        { name: "Plan Start", amount: "19 €/mes",  status: "Activa",  count: 2310},
                        { name: "Plan Scale", amount: "variable",  status: "Activa",  count: 124 },
                      ].map((s) => (
                        <div key={s.name} className="flex items-center justify-between rounded-xl border px-4 py-3"
                          style={{ borderColor: C.border }}>
                          <div>
                            <p className="text-[13px] font-medium" style={{ color: C.dark }}>{s.name}</p>
                            <p className="text-[11px]" style={{ color: C.muted }}>{s.count} suscriptores</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-medium" style={{ color: C.dark }}>{s.amount}</p>
                            <span className="text-[10px] text-emerald-600">{s.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.tag === "Payment Links" && (
                    <div className="space-y-3">
                      <div className="rounded-xl border p-3 flex items-center gap-2.5"
                        style={{ borderColor: C.border, background: C.bg }}>
                        <Link2 className="h-4 w-4 shrink-0" style={{ color: C.blue }} />
                        <span className="text-[12px] font-mono" style={{ color: C.muted }}>
                          pay.payforce.co/l/abc123
                        </span>
                        <span className="ml-auto text-[10px] text-emerald-600 font-medium">Activo</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { v: "127",    l: "Visitas" },
                          { v: "84",     l: "Pagos"   },
                          { v: "66,1%",  l: "Conversión" },
                        ].map((s) => (
                          <div key={s.l} className="rounded-xl border py-3" style={{ borderColor: C.border }}>
                            <p className="text-[18px] font-normal tabular-nums" style={{ color: C.dark }}>{s.v}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{s.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.tag === "Dashboard financiero" && (
                    <div className="space-y-2.5">
                      {[
                        { label: "Volumen mes",   value: "94.730 €",  change: "+8%",  up: true  },
                        { label: "Disputas",       value: "2",         change: "-67%", up: true  },
                        { label: "Próximo payout", value: "18.240 €",  change: "Lunes",up: true  },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center justify-between border-b py-2.5 last:border-0"
                          style={{ borderColor: C.border }}>
                          <span className="text-[13px]" style={{ color: C.muted }}>{s.label}</span>
                          <div className="text-right">
                            <p className="text-[13px] font-medium" style={{ color: C.dark }}>{s.value}</p>
                            <p className={`text-[10px] ${s.up ? "text-emerald-600" : "text-red-500"}`}>{s.change}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TapToPaySection() {
  return (
    <section style={{ background: "#000000" }} className="relative overflow-hidden">
      {/* Glow radial sutil */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.12) 0%, transparent 70%)",
        }} />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-0 text-center">
        {/* Etiqueta */}
        <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-medium mb-6"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.04)" }}>
          <Zap className="h-3 w-3" style={{ color: "#2563EB" }} />
          Tap to Pay · Solo móvil
        </span>

        {/* Headline */}
        <h2 className="text-[36px] md:text-[60px] font-semibold leading-[1.06] tracking-[-1.5px] text-white max-w-3xl mx-auto">
          Tu móvil es
          <br />
          <span style={{ color: "#2563EB" }}>tu TPV</span>
        </h2>

        <p className="mt-5 text-[16px] md:text-[18px] max-w-lg mx-auto leading-relaxed"
          style={{ color: "rgba(255,255,255,0.45)" }}>
          Acerca cualquier tarjeta a tu iPhone y cobra al instante. Sin hardware, sin cables, sin esperas.
        </p>

        {/* Imagen en grande */}
        <div className="mt-12 relative">
          <Image
            src="/images/tap-to-pay.png"
            alt="Tap to Pay con iPhone — PayForce"
            width={1020}
            height={680}
            quality={100}
            priority
            className="mx-auto w-full max-w-4xl object-contain select-none"
            style={{ marginBottom: "-2px" }}
          />
          {/* Fade bottom para transición suave a la sección siguiente */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #000000)" }} />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <Tag color={C.blue} label="Dashboard" />
          <h2 className="mt-4 text-[36px] md:text-[48px] font-semibold leading-tight tracking-tight"
            style={{ color: C.dark }}>
            Todo en una sola pantalla
          </h2>
          <p className="mt-4 text-[17px] max-w-xl mx-auto" style={{ color: C.muted }}>
            Transacciones, balances, disputas y payouts. En tiempo real, sin necesidad de abrir Stripe.
          </p>
        </div>

        {/* Table mockup */}
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
          {/* Table header */}
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.border, background: "#F8FAFC" }}>
            <h3 className="text-[14px] font-medium" style={{ color: C.dark }}>Transacciones recientes</h3>
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color: C.muted }}>47 resultados</span>
              <button className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition hover:bg-slate-50"
                style={{ borderColor: C.border, color: C.dark }}>
                Exportar
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-5 gap-0 border-b px-6 py-2.5"
            style={{ borderColor: C.border, background: "#F8FAFC" }}>
            {["CLIENTE", "MÉTODO", "IMPORTE", "ESTADO", "FECHA"].map((h) => (
              <span key={h} className="text-[10px] font-medium uppercase tracking-widest" style={{ color: C.muted }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: C.border }}>
            {TRANSACTIONS.map((t) => (
              <div key={t.name} className="grid grid-cols-5 gap-0 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-500 shrink-0">
                    {t.name[0]}
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: C.dark }}>{t.name}</span>
                </div>
                <span className="text-[13px] flex items-center" style={{ color: C.muted }}>{t.method}</span>
                <span className="text-[13px] font-medium tabular-nums flex items-center" style={{ color: C.dark }}>
                  {t.amount}
                </span>
                <div className="flex items-center">
                  <StatusBadge status={t.status} />
                </div>
                <span className="text-[12px] flex items-center" style={{ color: C.muted }}>{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckoutUI() {
  return (
    <section className="py-24" style={{ background: C.bg }}>
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col md:flex-row items-center gap-16">
          {/* Texto */}
          <div className="flex-1 space-y-5">
            <Tag color="#7C3AED" label="Checkout" />
            <h2 className="text-[36px] md:text-[44px] font-semibold leading-tight tracking-tight"
              style={{ color: C.dark }}>
              Un checkout que convierte
            </h2>
            <p className="text-[16px] leading-relaxed" style={{ color: C.muted }}>
              Formulario de pago moderno, rápido y optimizado para móvil. Compatible con Apple Pay,
              Google Pay y cualquier tarjeta sin configuración adicional.
            </p>
            <ul className="space-y-2.5">
              {[
                "Apple Pay y Google Pay nativos",
                "Autorrelleno de tarjeta",
                "Soporte multi-idioma",
                "Diseño adaptable a tu marca",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: C.muted }}>
                  <Check className="h-4 w-4 shrink-0 text-violet-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Formulario mockup */}
          <div className="flex-1 w-full max-w-[380px]">
            <div className="rounded-2xl border bg-white p-7 shadow-sm" style={{ borderColor: C.border }}>
              {/* Merchant */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b" style={{ borderColor: C.border }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-[12px] font-semibold"
                  style={{ background: C.blue }}>
                  PF
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: C.dark }}>Mi Tienda Online</p>
                  <p className="text-[12px]" style={{ color: C.muted }}>Pedido #1024</p>
                </div>
                <span className="ml-auto text-[20px] font-normal tabular-nums" style={{ color: C.dark }}>
                  149,00 €
                </span>
              </div>

              {/* Apple Pay btn */}
              <button className="w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-3 text-[14px] font-medium text-white transition hover:opacity-90"
                style={{ background: "#000" }}>
                <svg viewBox="0 0 20 24" width="16" fill="white"><path d="M14.2 0c.1 1.6-.6 3.1-1.5 4.2C11.8 5.4 10.3 6 8.9 5.9c-.1-1.6.6-3.1 1.5-4.1C11.4.7 12.9.1 14.2 0zm3.7 8.3c-1.7-1-3.3-1-4.1-1-1 0-2 .3-2.8.5-.5.1-.9.3-1.2.3-.4 0-.8-.1-1.3-.3C7.8 7.6 7 7.4 6 7.4c-2.2 0-4.5 1.3-5.7 3.4C-1 13.9-.4 19.5 2.8 23c1 1.4 2.4 2.9 4.2 2.9 1 0 1.7-.3 2.5-.6.8-.3 1.6-.6 2.8-.6 1.1 0 1.9.3 2.7.6.8.3 1.6.6 2.7.6 1.9-.1 3.3-1.7 4.3-3.1.7-1 1.2-2 1.5-3-1.5-.7-3.3-2.3-3.6-5-.3-2.4 1.3-4.3 2.2-5.1l.5-.4z"/></svg>
                Pagar con Apple Pay
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 border-t" style={{ borderColor: C.border }} />
                <span className="text-[11px]" style={{ color: C.muted }}>o con tarjeta</span>
                <div className="flex-1 border-t" style={{ borderColor: C.border }} />
              </div>

              {/* Card fields */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] mb-1.5 font-medium" style={{ color: C.muted }}>Número de tarjeta</p>
                  <div className="rounded-xl border px-4 py-2.5 text-[14px] flex items-center justify-between"
                    style={{ borderColor: C.border, color: "#94A3B8" }}>
                    <span>4242 4242 4242 4242</span>
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] mb-1.5 font-medium" style={{ color: C.muted }}>Caducidad</p>
                    <div className="rounded-xl border px-4 py-2.5 text-[14px]"
                      style={{ borderColor: C.border, color: "#94A3B8" }}>
                      12 / 27
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] mb-1.5 font-medium" style={{ color: C.muted }}>CVV</p>
                    <div className="rounded-xl border px-4 py-2.5 text-[14px]"
                      style={{ borderColor: C.border, color: "#94A3B8" }}>
                      •••
                    </div>
                  </div>
                </div>
                <button className="w-full rounded-xl py-3 text-[14px] font-medium text-white transition hover:opacity-90"
                  style={{ background: C.blue }}>
                  Pagar 149,00 €
                </button>
              </div>

              {/* Footer */}
              <p className="mt-4 text-center text-[10px]" style={{ color: "#94A3B8" }}>
                Protegido por PayForce · PCI DSS · SSL 256-bit
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-5xl px-6 space-y-20">

        {/* Logos */}
        <div className="text-center">
          <p className="text-[12px] uppercase tracking-widest mb-8" style={{ color: C.muted }}>
            Empresas que confían en PayForce
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {TRUST_LOGOS.map((logo) => (
              <span key={logo} className="text-[16px] font-semibold tracking-tight" style={{ color: "#CBD5E1" }}>
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl border p-8 md:p-10" style={{ borderColor: C.border, background: C.bg }}>
          <div className="flex flex-col md:flex-row items-start gap-10">
            <div className="flex-1">
              <h2 className="text-[28px] font-semibold mb-3" style={{ color: C.dark }}>
                Seguridad de nivel bancario
              </h2>
              <p className="text-[15px] leading-relaxed" style={{ color: C.muted }}>
                Tu dinero y el de tus clientes están protegidos por los mismos estándares
                que usan los bancos europeos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {[
                { icon: Shield, label: "PCI DSS Level 1", desc: "Máximo nivel de seguridad" },
                { icon: Globe,  label: "3D Secure",        desc: "Autenticación reforzada" },
                { icon: Zap,    label: "Cifrado SSL 256",  desc: "Datos siempre encriptados" },
                { icon: CheckCircle2, label: "SCA compliant", desc: "Normativa PSD2 europea" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${C.blue}12`, border: `1px solid ${C.blue}20` }}>
                      <Icon className="h-4 w-4" style={{ color: C.blue }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: C.dark }}>{s.label}</p>
                      <p className="text-[11px]" style={{ color: C.muted }}>{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border p-6" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[14px] leading-relaxed mb-5" style={{ color: C.muted }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ background: C.blue }}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: C.dark }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: C.muted }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="py-24" style={{ background: C.bg }}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-[36px] md:text-[52px] font-semibold leading-tight tracking-tight" style={{ color: C.dark }}>
          Empieza a cobrar hoy
        </h2>
        <p className="mt-4 text-[17px]" style={{ color: C.muted }}>
          Sin tarjeta de crédito. Sin permanencia. Integración en menos de una hora.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup"
            className="flex items-center gap-2 rounded-lg px-7 py-3.5 text-[15px] font-medium text-white transition hover:opacity-90"
            style={{ background: C.blue, boxShadow: `0 1px 4px ${C.blue}30` }}>
            Crear cuenta gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/about#contact"
            className="flex items-center gap-2 rounded-lg border px-7 py-3.5 text-[15px] font-medium transition hover:bg-white"
            style={{ borderColor: C.border, color: C.dark }}>
            Hablar con ventas
          </Link>
        </div>
        <p className="mt-5 text-[12px]" style={{ color: C.muted }}>
          Ya confían en PayForce más de 2.400 empresas en España y LATAM.
        </p>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductSections />
      <TapToPaySection />
      <DashboardPreview />
      <CheckoutUI />
      <Trust />
      <CtaFinal />
    </>
  );
}
