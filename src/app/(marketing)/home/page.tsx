import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroHeadline } from "@/components/marketing/HeroHeadline";
import dynamic from "next/dynamic";
import { DashboardShowcase } from "@/components/marketing/DashboardShowcase";

const FloatingIconsSection = dynamic(
  () => import("@/components/marketing/FloatingIconsSection").then(m => ({ default: m.FloatingIconsSection }))
);
const TimelineSections = dynamic(
  () => import("@/components/marketing/TimelineSections").then(m => ({ default: m.TimelineSections }))
);

export const metadata: Metadata = {
  title: "PayForce — Infraestructura de pagos para tu negocio",
};

const BG_GRAY = "#E9E7EC";
const ACCENT  = "#2D1F3D";

/* ─── Tap to Pay visual ─────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div style={{ background: "#000000" }}>
      {/* ── HERO — Apple style ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white" style={{ minHeight: "100svh", borderRadius: "0 0 120px 120px", boxShadow: "0 40px 120px rgba(0,0,0,0.65)", position: "relative", zIndex: 10 }}>

        {/* Halo sutil centrado */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 60%, rgba(45,31,61,0.06) 0%, transparent 70%)" }} />

        {/* ── Contenido ── */}
        <div className="relative z-10 flex flex-col items-center pt-24 md:pt-28 px-4">

          {/* Headline */}
          <HeroHeadline />

          {/* Subtítulo */}
          <p className="mt-6 text-center text-[17px] leading-relaxed md:text-[21px]"
            style={{ color: "rgba(0,0,0,0.42)", maxWidth: 540, fontWeight: 400 }}>
            Abre tu cuenta en 30 segundos. Crea un link de pago y empieza a cobrar sin límites.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-medium text-white transition-all hover:opacity-85 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35), 0 1px 4px rgba(139,92,246,0.25)",
              }}>
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4 opacity-80" />
            </Link>
            <Link href="/solutions"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-medium text-white transition-all hover:opacity-85 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
                boxShadow: "0 4px 20px rgba(14,165,233,0.30), 0 1px 4px rgba(6,182,212,0.20)",
              }}>
              Ver soluciones
            </Link>
          </div>

          <div className="mb-16" />
        </div>
      </section>

      {/* ── Todo lo demás sobre fondo negro ────────────────────────── */}
      <div style={{ background: "#000000" }}>

      {/* ── SHOWCASE DASHBOARD ─────────────────────────────────────── */}
      <DashboardShowcase />

      {/* ── SECCIONES NUMERADAS — gris suave ───────────────────────── */}
      <div style={{
        background: BG_GRAY,
        borderRadius: "80px 80px 0 0",
        boxShadow: "0 -32px 100px rgba(0,0,0,0.55)",
        position: "relative",
        zIndex: 10,
      }}>
        <TimelineSections />
      </div>

      {/* ── INTEGRACIÓN UNIVERSAL ─────────────────────────────────── */}
      <FloatingIconsSection />

      {/* ── CTA FINAL ───────────────────────────────────────────────── */}
      <section className="relative px-4 py-16 text-center md:px-6 md:py-32 overflow-hidden mx-4 md:mx-8 mt-12 md:mt-20 mb-4 md:mb-8"
        style={{
          background: "linear-gradient(135deg, #04020e 0%, #1a0b38 38%, #0d1c38 65%, #05091c 100%)",
          borderRadius: 48,
        }}>
        {/* 1. Grano fino */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "160px", mixBlendMode: "soft-light",
          }} />
        {/* 3. Glow violeta vibrante — top-right */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 55% 45% at 88% 8%, rgba(130,50,255,0.55) 0%, transparent 58%)" }} />
        {/* 4. Glow indigo — bottom-left */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 45% at 8% 92%, rgba(50,80,230,0.35) 0%, transparent 55%)" }} />
        {/* 5. Aurora central */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 130% 40% at 50% 50%, rgba(100,40,200,0.13) 0%, transparent 70%)" }} />
        {/* 6. Teal top */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 28% at 50% 0%, rgba(13,210,185,0.08) 0%, transparent 65%)" }} />

        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="text-[30px] leading-tight text-white md:text-[60px]"
            style={{ letterSpacing: "-0.025em", fontWeight: 400 }}>
            Lista en minutos.<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Escala sin límites.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed md:mt-5 md:text-[18px]"
            style={{ color: "rgba(255,255,255,0.40)" }}>
            Sin tarjeta de crédito. Sin permanencia. Cancela cuando quieras.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-9 py-4 text-[15px] font-medium text-white transition-opacity hover:opacity-85 sm:w-auto"
              style={{ background: "#ffffff", color: "#111111" }}>
              Crear cuenta gratis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/about#contact"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-9 py-4 text-[15px] transition-all hover:opacity-70 sm:w-auto"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
              Hablar con ventas
            </Link>
          </div>
        </div>
      </section>

      </div>{/* fin wrapper oscuro */}
    </div>
  );
}

