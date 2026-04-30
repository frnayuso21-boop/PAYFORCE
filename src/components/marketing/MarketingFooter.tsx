import Link from "next/link";
import { PayForceLogo } from "@/components/marketing/PayForceLogo";

const cols = [
 {
 title: "Producto",
 links: [
 { label: "Inicio", href: "/home"},
 { label: "Soluciones", href: "/solutions"},
 { label: "Titan Core", href: "/solutions#titan"},
 { label: "Payment Links", href: "/solutions"},
 ],
 },
 {
 title: "Empresa",
 links: [
 { label: "Quiénes somos", href: "/about"},
 { label: "Blog", href: "/blog"},
 { label: "Carreras", href: "/about#team"},
 { label: "Contacto", href: "/about#contact"},
 ],
 },
 {
 title: "Legal",
 links: [
 { label: "Privacidad", href: "#"},
 { label: "Términos de uso", href: "#"},
 { label: "Cookies", href: "#"},
 { label: "Seguridad", href: "#"},
 ],
 },
];

const BORDER = "#E3E8EF";
const MUTED  = "#425466";

export function MarketingFooter() {
 return (
 <footer style={{ background: "#F6F9FC", borderTop: `1px solid ${BORDER}` }}>
 <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
 <div className="grid gap-10 grid-cols-2 md:grid-cols-[1fr_auto_auto_auto]">
 <div className="col-span-2 max-w-[260px] md:col-span-1">
 <div className="mb-4">
 <PayForceLogo variant="dark" height={24} />
 </div>
 <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
 Infraestructura de pagos para empresas que quieren crecer sin fricciones.
 </p>
 <div className="mt-5 flex items-center gap-2">
 <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
 className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-white"
 style={{ borderColor: BORDER, color: "#94A3B8" }}>
 <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
 </svg>
 </a>
 <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
 className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:bg-white"
 style={{ borderColor: BORDER, color: "#94A3B8" }}>
 <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
 <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
 </svg>
 </a>
 </div>
 </div>

 {cols.map((col) => (
 <div key={col.title}>
 <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
 {col.title}
 </p>
 <ul className="space-y-3">
 {col.links.map((l) => (
 <li key={l.label}>
 <Link href={l.href} className="text-[13px] transition-colors hover:text-slate-900"
 style={{ color: MUTED }}>
 {l.label}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>

 <div className="mt-10 flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row"
 style={{ borderTop: `1px solid ${BORDER}` }}>
 <p className="text-[12px]" style={{ color: "#94A3B8" }} suppressHydrationWarning>
 © {new Date().getFullYear()} PayForce Technologies S.L. Todos los derechos reservados.
 </p>
 <div className="flex items-center gap-1.5">
 <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
 <p className="text-[12px]" style={{ color: "#94A3B8" }}>Todos los sistemas operativos</p>
 </div>
 </div>
 </div>
 </footer>
 );
}
