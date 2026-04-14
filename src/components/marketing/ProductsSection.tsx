"use client";

import Link from "next/link";
import { ArrowRight, Zap, BarChart3, Globe, CreditCard, Shield, Layers } from "lucide-react";

const ACCENT = "#2D1F3D";

const products = [
  {
    icon: BarChart3,
    color: "#F59E0B",
    glow:  "rgba(245,158,11,0.20)",
    name:  "Titan Core",
    tag:   "Motor de procesamiento",
    desc:  "Infraestructura enterprise que procesa millones de transacciones con latencia < 200ms. Enrutamiento inteligente, failover automático y SCA europeo nativo.",
    pills: ["135+ divisas", "99.99% uptime", "3D Secure 2.0"],
    href:  "/solutions#titan",
  },
  {
    icon: Zap,
    color: "#2D1F3D",
    glow:  "rgba(124,58,237,0.20)",
    name:  "Payment Links",
    tag:   "Cobros instantáneos",
    desc:  "Genera un link de cobro en 3 segundos. Checkout mobile-first con 84% de conversión. Sin código, sin integraciones, sin fricción.",
    pills: ["Sin código", "84% conv.", "Multi-método"],
    href:  "/solutions",
  },
  {
    icon: Globe,
    color: "#059669",
    glow:  "rgba(5,150,105,0.18)",
    name:  "Merchant of Record",
    tag:   "Compliance global",
    desc:  "PayForce actúa como MoR en 50+ países. IVA, GST y VAT gestionados automáticamente. Tú recibes el importe neto sin complicaciones fiscales.",
    pills: ["50+ países", "IVA/GST auto", "Liquidación semanal"],
    href:  "/solutions",
  },
  {
    icon: CreditCard,
    color: "#2563EB",
    glow:  "rgba(37,99,235,0.18)",
    name:  "Dashboard",
    tag:   "Panel unificado",
    desc:  "Gestiona pagos, payouts, disputas y analytics desde un único panel white-label. Datos en tiempo real con polling cada 5s.",
    pills: ["White-label", "Live data", "Multi-cuenta"],
    href:  "/solutions",
  },
  {
    icon: Shield,
    color: "#DC2626",
    glow:  "rgba(220,38,38,0.18)",
    name:  "Fraud Shield",
    tag:   "Antifraude con IA",
    desc:  "Detección de fraude impulsada por Claude (Anthropic). Análisis de comportamiento, fingerprint y geolocalización en < 150ms por transacción.",
    pills: ["Claude AI", "< 150ms", "Score en tiempo real"],
    href:  "/solutions",
  },
  {
    icon: Layers,
    color: "#0891B2",
    glow:  "rgba(8,145,178,0.18)",
    name:  "Connect",
    tag:   "Plataforma multi-merchant",
    desc:  "Onboarding de merchants en minutos. Gestiona comisiones, splits y liquidaciones de toda tu red desde un único punto de control.",
    pills: ["Sub-cuentas", "Splits automáticos", "KYC incluido"],
    href:  "/solutions",
  },
];

export function ProductsSection() {
  return (
    <section style={{ background: "#F3F4F6" }} className="px-4 py-16 md:px-12 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-10 text-center md:mb-16">
          <span className="inline-block mb-4 rounded-full px-3 py-1 text-[10px] tracking-[2px] uppercase md:text-[11px] md:tracking-[3px]"
            style={{ background: "rgba(13,223,200,0.12)", border: "1px solid rgba(13,223,200,0.30)", color: "#0891B2" }}>
            Productos
          </span>
          <h2 className="text-[30px] leading-tight text-black md:text-[56px]"
            style={{ letterSpacing: "-0.03em", fontWeight: 400 }}>
            Todo lo que necesitas<br />
            <span style={{ color: "rgba(0,0,0,0.70)" }}>en una sola plataforma</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed md:mt-5 md:text-[17px]" style={{ color: "rgba(0,0,0,0.65)" }}>
            Cada producto está diseñado para integrarse con los demás. Usa solo lo que necesitas o despliega el stack completo.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.name}
                href={p.href}
                className="group relative flex flex-col gap-4 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {/* Glow en hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 80% 60% at 30% 30%, ${p.glow} 0%, transparent 70%)` }} />

                {/* Icono */}
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  <Icon className="h-5 w-5" style={{ color: p.color }} />
                </div>

                {/* Texto */}
                <div className="relative flex flex-col gap-1.5 flex-1">
                  <p className="text-[10px] tracking-[2.5px] uppercase" style={{ color: p.color, opacity: 0.85 }}>
                    {p.tag}
                  </p>
                  <h3 className="text-[22px] text-black" style={{ fontWeight: 500, letterSpacing: "-0.02em" }}>
                    {p.name}
                  </h3>
                  <p className="text-[14px] leading-relaxed mt-1" style={{ color: "rgba(0,0,0,0.65)" }}>
                    {p.desc}
                  </p>
                </div>

                {/* Pills */}
                <div className="relative flex flex-wrap gap-1.5 mt-auto">
                  {p.pills.map((pill) => (
                    <span key={pill} className="rounded-full px-2.5 py-0.5 text-[11px]"
                      style={{ background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.70)", border: "1px solid rgba(0,0,0,0.08)" }}>
                      {pill}
                    </span>
                  ))}
                </div>

                {/* Arrow */}
                <div className="relative flex items-center gap-1 text-[12px] opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: p.color }}>
                  Explorar <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA bottom */}
        <div className="mt-12 text-center">
          <Link href="/solutions"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] transition-all hover:opacity-80"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.10)", color: "rgba(0,0,0,0.70)" }}>
            Ver todos los productos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
