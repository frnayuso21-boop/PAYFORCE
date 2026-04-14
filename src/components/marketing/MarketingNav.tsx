"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, ArrowRight,
  Zap, Globe, BarChart3, CreditCard, Shield, Layers,
  Receipt, RefreshCw, FileText, Calculator, TrendingUp,
  Code2, BookOpen, Terminal, GitBranch,
  ShoppingBag, Building2, Users, Rocket, Store,
  Coffee, HeartHandshake, Tag,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PayForceLogo } from "@/components/marketing/PayForceLogo";

/* ─── Tipos ──────────────────────────────────────────────────────────── */
interface NavLink { label: string; desc: string; href: string; icon: React.ElementType; color: string; }
interface NavGroup { heading: string; links: NavLink[]; }
type MegaData = NavGroup[];

/* ─── Datos de mega menús ────────────────────────────────────────────── */
const MEGA_PRODUCTOS: MegaData = [
  {
    heading: "Pagos",
    links: [
      { icon: Zap,        color: "#0DDFC8", label: "Payment Links",   desc: "Cobra en segundos sin código",          href: "/solutions" },
      { icon: CreditCard, color: "#2563EB", label: "Checkout",        desc: "Formulario de pago prediseñado",        href: "/solutions" },
      { icon: Terminal,   color: "#0891B2", label: "Terminal",        desc: "Pagos presenciales y TPV",              href: "/solutions" },
      { icon: Globe,      color: "#059669", label: "Métodos de pago", desc: "Tarjeta, Bizum, Apple Pay y más",       href: "/solutions" },
    ],
  },
  {
    heading: "Facturación",
    links: [
      { icon: RefreshCw,  color: "#0DDFC8", label: "Suscripciones",   desc: "Billing recurrente flexible",           href: "/solutions" },
      { icon: Receipt,    color: "#F59E0B", label: "Invoicing",       desc: "Facturas únicas y recurrentes",         href: "/solutions" },
      { icon: Calculator, color: "#059669", label: "Tax automático",  desc: "IVA y Sales Tax en 50+ países",         href: "/solutions" },
      { icon: FileText,   color: "#0891B2", label: "Data Pipeline",   desc: "Sincronización contable en tiempo real",href: "/solutions" },
    ],
  },
  {
    heading: "Plataformas",
    links: [
      { icon: Layers,     color: "#0891B2", label: "Connect",         desc: "Multi-merchant y marketplaces",         href: "/solutions" },
      { icon: BarChart3,  color: "#F59E0B", label: "TITAN 1.4.1",     desc: "Radar de fraude en tiempo real",        href: "/solutions#titan" },
      { icon: Shield,     color: "#DC2626", label: "Fraud Shield",    desc: "Antifraude con IA en tiempo real",      href: "/solutions" },
      { icon: TrendingUp, color: "#0DDFC8", label: "Analytics",       desc: "Métricas de conversión unificadas",     href: "/solutions" },
    ],
  },
  {
    heading: "Más",
    links: [
      { icon: Zap,        color: "#059669", label: "TITAN 1.4.1",        desc: "Radar de fraude en tiempo real",     href: "/solutions#titan" },
      { icon: CreditCard, color: "#2563EB", label: "Issuing",            desc: "Tarjetas físicas y virtuales",       href: "/solutions" },
      { icon: Layers,     color: "#0891B2", label: "White-label",        desc: "Tu marca, nuestra infraestructura",  href: "/solutions" },
    ],
  },
];

const MEGA_SOLUCIONES: MegaData = [
  {
    heading: "Por caso de uso",
    links: [
      { icon: ShoppingBag,    color: "#0DDFC8", label: "E-commerce",           desc: "Vende online con máxima conversión",       href: "/solutions" },
      { icon: RefreshCw,      color: "#059669", label: "SaaS y suscripciones", desc: "Billing recurrente sin complicaciones",    href: "/solutions" },
      { icon: Layers,         color: "#0891B2", label: "Marketplaces",         desc: "Pagos entre compradores y vendedores",     href: "/solutions" },
      { icon: Globe,          color: "#F59E0B", label: "Empresas internac.",   desc: "Cobros en múltiples divisas y países",     href: "/solutions" },
      { icon: Building2,      color: "#DC2626", label: "Finanzas integradas",  desc: "Embed pagos en tu plataforma",             href: "/solutions" },
    ],
  },
  {
    heading: "Por sector",
    links: [
      { icon: Coffee,         color: "#F59E0B", label: "Hostelería y ocio",    desc: "Reservas, tickets y pagos en local",       href: "/solutions" },
      { icon: Store,          color: "#059669", label: "Comercio minorista",   desc: "Omnicanal: físico y digital",              href: "/solutions" },
      { icon: HeartHandshake, color: "#E11D48", label: "ONGs y fundaciones",   desc: "Donaciones y membresías recurrentes",      href: "/solutions" },
      { icon: Tag,            color: "#0DDFC8", label: "Creadores de contenido", desc: "Monetiza tu audiencia directamente",     href: "/solutions" },
    ],
  },
  {
    heading: "Por etapa",
    links: [
      { icon: Rocket,         color: "#0DDFC8", label: "Startups",            desc: "Integra en minutos, escala sin límites",   href: "/solutions" },
      { icon: Building2,      color: "#0891B2", label: "Grandes empresas",    desc: "SLAs enterprise y soporte dedicado",       href: "/solutions" },
      { icon: Users,          color: "#059669", label: "Agencias y partners", desc: "Programa de socios white-label",           href: "/solutions" },
    ],
  },
];

const MEGA_DEVS: MegaData = [
  {
    heading: "Documentación",
    links: [
      { icon: BookOpen,  color: "#0DDFC8", label: "Guía de inicio rápido", desc: "Acepta tu primer pago en 5 min",     href: "/docs" },
      { icon: Code2,     color: "#2563EB", label: "Referencia de la API",  desc: "Endpoints, parámetros y respuestas", href: "/docs" },
      { icon: Terminal,  color: "#0891B2", label: "SDKs y librerías",      desc: "TypeScript, Python, PHP y más",      href: "/docs" },
    ],
  },
  {
    heading: "Guías",
    links: [
      { icon: Zap,       color: "#F59E0B", label: "Integrar pagos online",  desc: "End-to-end con código de ejemplo",   href: "/docs" },
      { icon: RefreshCw, color: "#059669", label: "Crear suscripciones",    desc: "Billing recurrente paso a paso",     href: "/docs" },
      { icon: Layers,    color: "#0891B2", label: "Construir un marketplace", desc: "Pagos multi-vendedor con Connect", href: "/docs" },
    ],
  },
  {
    heading: "Recursos",
    links: [
      { icon: GitBranch, color: "#0DDFC8", label: "Ejemplos de código",    desc: "Repositorios listos para clonar",    href: "/docs" },
      { icon: BarChart3, color: "#F59E0B", label: "Estado del sistema",    desc: "Uptime y latencia en tiempo real",   href: "/docs" },
      { icon: BookOpen,  color: "#059669", label: "Blog para devs",        desc: "Técnicas avanzadas y novedades",     href: "/blog" },
    ],
  },
];

const MEGA_ABOUT: MegaData = [
  {
    heading: "Empresa",
    links: [
      { icon: HeartHandshake, color: "#0DDFC8", label: "Nuestra misión",  desc: "Por qué existe PayForce",              href: "/about" },
      { icon: Users,          color: "#059669", label: "El equipo",       desc: "Las personas detrás del producto",     href: "/about#team" },
      { icon: Tag,            color: "#E11D48", label: "Valores",         desc: "Transparencia, velocidad, confianza",  href: "/about" },
    ],
  },
  {
    heading: "Contenido",
    links: [
      { icon: BookOpen,       color: "#0DDFC8", label: "Blog",            desc: "Artículos sobre pagos y fintech",      href: "/blog" },
      { icon: FileText,       color: "#0891B2", label: "Changelog",       desc: "Últimas novedades del producto",       href: "/blog" },
    ],
  },
];

/* ─── Mega menu ──────────────────────────────────────────────────────── */
function MegaMenu({ groups, wide = false }: { groups: MegaData; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50"
      style={{ width: wide ? 780 : 620 }}
    >
      {/* Flecha */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 rounded-sm z-10"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />

      <div className="rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 4px 20px rgba(0,0,0,0.06)",
        }}>

        {/* Grid de columnas */}
        <div className={`grid gap-0 p-4`}
          style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
          {groups.map((group, gi) => (
            <div key={group.heading}
              className="px-3 py-2"
              style={gi > 0 ? { borderLeft: "1px solid rgba(255,255,255,0.05)" } : {}}>
              <p className="mb-2 px-2 text-[10px] font-normal tracking-[2px] uppercase"
                style={{ color: "rgba(0,0,0,0.35)" }}>
                {group.heading}
              </p>
              {group.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.label} href={link.href}
                    className="group flex items-start gap-2.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.04]">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${link.color}18`, border: `1px solid ${link.color}30` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: link.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-gray-800 group-hover:text-gray-900 transition-colors leading-tight">
                        {link.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "rgba(0,0,0,0.38)" }}>
                        {link.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <span className="text-[11px]" style={{ color: "rgba(0,0,0,0.30)" }}>
            Infraestructura de pagos · PayForce
          </span>
          <Link href="/solutions"
            className="flex items-center gap-1 text-[11px] transition-colors hover:text-gray-900"
            style={{ color: "rgba(0,0,0,0.45)" }}>
            Ver todo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── NavItem ────────────────────────────────────────────────────────── */
function NavItem({
  label, href, active, mega, wide, light,
}: {
  label: string; href: string; active: boolean;
  mega?: MegaData; wide?: boolean; light?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const baseColor  = light ? "text-white/55 hover:text-white" : "text-gray-500 hover:text-gray-900";
  const activeColor = light ? "text-white"                     : "text-gray-900";

  return (
    <div className="relative"
      onMouseEnter={() => mega && setOpen(true)}
      onMouseLeave={() => setOpen(false)}>

      <Link href={href}
        className={`flex items-center gap-0.5 px-4 py-2 text-[13px] rounded-full transition-colors select-none ${
          active ? activeColor : baseColor
        }`}>
        {label}
        {mega && (
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            viewBox="0 0 12 12" width={10} height={10}
            fill="none" className="ml-0.5 opacity-40">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        )}
      </Link>

      <AnimatePresence>
        {open && mega && <MegaMenu groups={mega} wide={wide} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── MarketingNav ───────────────────────────────────────────────────── */
export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className="absolute top-0 left-0 right-0 w-full z-50 transition-all duration-300 [&>div]:relative"
      style={{
        background: scrolled ? "rgba(244,243,245,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.07)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-6">

        {/* Logo — izquierda */}
        <Link href="/home" className="flex-shrink-0 flex items-center">
          <PayForceLogo variant="dark" height={22} />
        </Link>

        {/* Links — centro absoluto */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-0">
          <NavItem label="Productos"       href="/home"      active={false}                     mega={MEGA_PRODUCTOS}  wide />
          <NavItem label="Soluciones"      href="/solutions" active={pathname === "/solutions"} mega={MEGA_SOLUCIONES} wide />
          <NavItem label="Desarrolladores" href="/docs"      active={pathname === "/docs"}      mega={MEGA_DEVS} />
          <NavItem label="Empresa"         href="/about"     active={pathname === "/about"}     mega={MEGA_ABOUT} />
        </nav>

        {/* CTAs — derecha */}
        <div className="hidden items-center gap-3 md:flex flex-shrink-0 ml-auto">
          <Link href="/login"
            className="text-[13px] font-normal transition-colors text-gray-500 hover:text-gray-900">
            Iniciar sesión
          </Link>
          <Link href="/contact"
            className="rounded-full px-5 py-2 text-[13px] font-normal text-white transition-opacity hover:opacity-75"
            style={{ background: "#2D1F3D" }}>
            Contactar con ventas
          </Link>
        </div>

        {/* Hamburger — mobile */}
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{    opacity: 0, height: 0 }}
            className="overflow-hidden md:hidden"
            style={{ background: "#F4F3F5", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
            <nav className="flex flex-col gap-1 px-6 py-4">
              {[
                { label: "Productos",       href: "/home"      },
                { label: "Soluciones",      href: "/solutions" },
                { label: "Desarrolladores", href: "/docs"      },
                { label: "Empresa",         href: "/about"     },
                { label: "Blog",            href: "/blog"      },
              ].map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-[14px] text-gray-500 hover:text-gray-900">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <Link href="/contact" onClick={() => setMobileOpen(false)}
                  className="block rounded-full py-2.5 text-center text-[13px] font-normal text-white"
                  style={{ background: "#2D1F3D" }}>
                  Contactar con ventas
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
