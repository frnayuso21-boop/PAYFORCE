import type { Metadata } from "next";
import Link from "next/link";
import {
  Link2, CreditCard, BarChart3, RefreshCcw,
  ShieldCheck, Webhook, Building2, Globe2,
  ArrowRight, CheckCircle2, Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Soluciones — PayForce",
  description:
    "Descubre todos los productos y soluciones de PayForce: Payment Links, Dashboard, Webhooks, Multi-merchant y más.",
};

// ─── Datos ────────────────────────────────────────────────────────────────────

const solutions = [
  {
    icon: CreditCard,
    tag: "Core",
    title: "Procesamiento de pagos",
    desc: "Acepta tarjetas de crédito, débito, Bizum y 40+ métodos de pago locales en más de 135 divisas. Autorización en menos de 200ms.",
    features: [
      "Visa, Mastercard, American Express",
      "3D Secure 2.0 automático",
      "Pagos recurrentes y suscripciones",
      "Tokenización de tarjetas",
      "Gestión de disputas integrada",
    ],
    color: "indigo",
  },
  {
    icon: Link2,
    tag: "Sin código",
    title: "Payment Links",
    desc: "Crea un enlace de pago en segundos y compártelo por email, WhatsApp o redes sociales. Sin integración técnica.",
    features: [
      "Generación instantánea de links",
      "Expiración y límite de usos configurables",
      "Personalización de marca",
      "Confirmación automática por email",
      "Compatible con cualquier dispositivo",
    ],
    color: "violet",
  },
  {
    icon: BarChart3,
    tag: "Analytics",
    title: "Dashboard & Analytics",
    desc: "Panel de control en tiempo real con métricas de volumen, transacciones, comisiones y payouts. Visión 360° de tu negocio.",
    features: [
      "Gráficos de volumen en tiempo real",
      "Exportación de datos en CSV",
      "Alertas configurables",
      "Historial completo de transacciones",
      "Reportes de disputas y reembolsos",
    ],
    color: "blue",
  },
  {
    icon: RefreshCcw,
    tag: "Automatización",
    title: "Payouts automáticos",
    desc: "Configura transferencias automáticas a tus merchants. Conciliación bancaria automática y reporting detallado.",
    features: [
      "Payouts diarios, semanales o manuales",
      "Soporte para cuentas SEPA/IBAN",
      "Deducción automática de comisiones",
      "Notificaciones de transferencia",
      "Panel de liquidaciones",
    ],
    color: "emerald",
  },
  {
    icon: Webhook,
    tag: "API",
    title: "Webhooks & API REST",
    desc: "Integra PayForce con tu stack tecnológico. API RESTful completa con SDKs para los principales lenguajes.",
    features: [
      "API REST documentada con OpenAPI",
      "Webhooks con reintentos automáticos",
      "Firma de eventos con HMAC-SHA256",
      "SDKs para Node.js, Python, PHP",
      "Entorno de pruebas sandbox",
    ],
    color: "amber",
  },
  {
    icon: Building2,
    tag: "SaaS",
    title: "Multi-merchant Platform",
    desc: "Gestiona múltiples comercios desde una sola plataforma. Ideal para marketplaces, franquicias y grupos empresariales.",
    features: [
      "Onboarding guiado por merchant",
      "Aislamiento completo de cuentas",
      "Comisiones diferenciadas por merchant",
      "Panel de control centralizado",
      "Compliance y KYC integrado",
    ],
    color: "rose",
  },
];

const useCases = [
  {
    icon: Globe2,
    title: "E-commerce",
    desc: "Conecta tu tienda online y empieza a aceptar pagos en minutos. Compatible con Shopify, WooCommerce y cualquier plataforma.",
  },
  {
    icon: Building2,
    title: "Marketplaces",
    desc: "Gestiona pagos entre compradores y vendedores con liquidaciones automáticas y comisiones configurables.",
  },
  {
    icon: RefreshCcw,
    title: "SaaS & Suscripciones",
    desc: "Facturación recurrente, gestión de pruebas gratuitas y upgrades automáticos para tu negocio de software.",
  },
  {
    icon: Zap,
    title: "Startups",
    desc: "Infraestructura de pagos enterprise desde el primer día. Escala desde cero hasta millones sin cambiar de plataforma.",
  },
];

const colorMap: Record<string, string> = {
  indigo:  "bg-indigo-50 text-indigo-400/60",
  violet:  "bg-violet-50 text-violet-600",
  blue:    "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber:   "bg-amber-50 text-amber-600",
  rose:    "bg-rose-50 text-rose-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SolutionsPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[12px] font-medium text-violet-700">
              PCI DSS Level 1 · ISO 27001
            </span>
          </div>
          <h1 className="mx-auto max-w-3xl text-[40px] font-light leading-[1.1] tracking-tight text-slate-900 md:text-[58px]"
            style={{ letterSpacing: "-0.03em" }}>
            Soluciones para cada{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-normal">
              tipo de negocio
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-slate-500">
            Desde un link de pago hasta una plataforma multi-merchant completa. PayForce se adapta a tu modelo de negocio.
          </p>
        </div>
      </section>

      {/* ── Solutions grid ───────────────────────────────────────────────── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => (
              <div
                key={s.title}
                className="flex flex-col rounded-2xl border border-white/[0.05] bg-[#111116] p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-white/[0.07] hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[s.color]}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="mb-1 text-[11px] font-normal uppercase tracking-widest text-white/25">
                  {s.tag}
                </span>
                <h3 className="mb-2 text-[17px] font-normal text-white/85">{s.title}</h3>
                <p className="mb-5 text-[13px] leading-relaxed text-white/35 flex-1">{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-[12px] text-white/45">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.05] bg-[#111116] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
              Casos de uso
            </p>
            <h2 className="text-[32px] font-normal tracking-tight text-white/85 md:text-[38px]">
              Diseñado para cualquier industria
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="rounded-2xl bg-[#111116] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#16161e] text-white/45">
                  <uc.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-normal text-white/85">{uc.title}</h3>
                <p className="text-[13px] leading-relaxed text-white/35">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security section ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl bg-[#16161e]">
            <div className="grid md:grid-cols-2">
              <div className="p-10 md:p-14">
                <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400">
                  Seguridad
                </p>
                <h2 className="text-[32px] font-normal tracking-tight text-white md:text-[38px]">
                  Construido para cumplir con los estándares más exigentes
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/25">
                  Toda transacción está cifrada con TLS 1.3. Los datos de tarjeta nunca pasan por nuestros servidores. Cumplimos con PCI DSS Level 1, GDPR y PSD2.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "PCI DSS Level 1 — el máximo nivel de seguridad",
                    "Cifrado AES-256 en reposo",
                    "3D Secure 2.0 y autenticación SCA",
                    "Monitoreo antifraude en tiempo real",
                    "Cumplimiento GDPR y PSD2",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                      <span className="text-[13px] text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center bg-[#111116]/5 p-10 md:p-14">
                <div className="grid grid-cols-2 gap-4">
                  {["PCI DSS", "ISO 27001", "GDPR", "PSD2"].map((cert) => (
                    <div
                      key={cert}
                      className="flex h-20 w-32 items-center justify-center rounded-2xl border border-white/10 bg-[#111116]/5"
                    >
                      <span className="text-[13px] font-normal text-white/70">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-[32px] font-normal tracking-tight text-white/85">
            Listo para empezar
          </h2>
          <p className="mt-4 text-[16px] text-white/35">
            Sin tarjeta de crédito. Sin permanencia. Sin complicaciones.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#16161e] px-6 py-3 text-[14px] font-normal text-white hover:bg-[#1a1a1a] transition-colors"
            >
              Crear cuenta gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about#contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-6 py-3 text-[14px] font-normal text-white/60 hover:border-slate-300 transition-colors"
            >
              Hablar con el equipo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
