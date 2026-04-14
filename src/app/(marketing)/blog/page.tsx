import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — PayForce",
  description:
    "Artículos sobre pagos digitales, fintech, regulación PSD2 y estrategias para hacer crecer tu negocio.",
};

// ─── Datos ────────────────────────────────────────────────────────────────────

const featured = {
  slug: "mor-centralizado-que-es",
  tag: "Arquitectura",
  tagColor: "bg-indigo-50 text-indigo-400/60",
  title: "Merchant of Record: qué es y por qué tu plataforma lo necesita",
  excerpt:
    "El modelo MOR está ganando terreno rápidamente entre marketplaces y plataformas SaaS. En este artículo explicamos cómo funciona, qué ventajas fiscales y de compliance ofrece, y cómo implementarlo en tu plataforma.",
  author: "Alejandro Ruiz",
  authorInitials: "AR",
  date: "12 Feb 2026",
  readTime: "8 min",
};

const posts = [
  {
    slug: "integracion-pagos-guia",
    tag: "Técnico",
    tagColor: "bg-blue-50 text-blue-600",
    title: "Guía completa de integración de pagos en 2026",
    excerpt:
      "Todo lo que necesitas saber para integrar cobros en tu plataforma: onboarding de merchants, comisiones, transferencias y notificaciones.",
    author: "David Torres",
    authorInitials: "DT",
    date: "5 Feb 2026",
    readTime: "12 min",
  },
  {
    slug: "psd2-sca-que-cambia",
    tag: "Regulación",
    tagColor: "bg-amber-50 text-amber-700",
    title: "PSD2 y SCA: lo que cambia para tu ecommerce en 2026",
    excerpt:
      "La Strong Customer Authentication ya es obligatoria en toda Europa. Te explicamos qué necesitas hacer para cumplir y cómo afecta a tu tasa de conversión.",
    author: "Marta Iglesias",
    authorInitials: "MI",
    date: "28 Ene 2026",
    readTime: "6 min",
  },
  {
    slug: "payment-links-sin-codigo",
    tag: "Producto",
    tagColor: "bg-emerald-50 text-emerald-700",
    title: "Payment Links: cobra sin una línea de código",
    excerpt:
      "Los Payment Links de PayForce te permiten cobrar en segundos. Descubre cómo crearlos, personalizarlos y hacer seguimiento de cada pago.",
    author: "Carlos Soto",
    authorInitials: "CS",
    date: "20 Ene 2026",
    readTime: "4 min",
  },
  {
    slug: "reducir-disputas-chargebacks",
    tag: "Estrategia",
    tagColor: "bg-rose-50 text-rose-700",
    title: "5 estrategias para reducir chargebacks en tu negocio",
    excerpt:
      "Las disputas son el mayor dolor de cabeza de cualquier negocio online. Aprende cómo prevenirlas con configuraciones inteligentes y buenas prácticas.",
    author: "Ana Castillo",
    authorInitials: "AC",
    date: "14 Ene 2026",
    readTime: "7 min",
  },
  {
    slug: "webhooks-nodejs-guia",
    tag: "Técnico",
    tagColor: "bg-blue-50 text-blue-600",
    title: "Cómo procesar notificaciones de pago en Node.js sin perder eventos",
    excerpt:
      "Las notificaciones mal implementadas pueden costar dinero. En este tutorial te mostramos el patrón correcto: idempotencia, respuesta rápida y procesamiento en background.",
    author: "David Torres",
    authorInitials: "DT",
    date: "8 Ene 2026",
    readTime: "10 min",
  },
  {
    slug: "fintech-tendencias-2026",
    tag: "Industria",
    tagColor: "bg-violet-50 text-violet-700",
    title: "Las 7 tendencias fintech que dominarán 2026",
    excerpt:
      "Pagos instantáneos, Open Banking, embedded finance, IA para fraude... Repasamos las tendencias que van a transformar la industria de los pagos este año.",
    author: "Laura Méndez",
    authorInitials: "LM",
    date: "2 Ene 2026",
    readTime: "9 min",
  },
];

const categories = [
  "Todos", "Técnico", "Producto", "Regulación", "Estrategia", "Industria",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
            Blog
          </p>
          <h1 className="mx-auto max-w-2xl text-[40px] font-normal leading-[1.1] tracking-tight text-white/85 md:text-[52px]">
            Recursos para hacer crecer tu negocio
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-white/35">
            Guías técnicas, tendencias fintech y estrategias de negocio del equipo de PayForce.
          </p>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="sticky top-[72px] z-40 border-b border-white/[0.05] bg-[#111116]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`
                  shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-normal transition-colors
                  ${i === 0
                    ? "bg-[#16161e] text-white"
                    : "text-white/35 hover:bg-[#16161e] hover:text-white/85"}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          {/* ── Featured post ──────────────────────────────────────────── */}
          <div className="mb-14">
            <Link
              href={`/blog/${featured.slug}`}
              className="group block overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f0f0f] to-[#1e1b4b] p-8 transition-all hover:shadow-2xl md:p-12"
            >
              <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-normal ${featured.tagColor} mb-4`}>
                    {featured.tag}
                  </span>
                  <h2 className="text-[26px] font-normal leading-snug tracking-tight text-white md:text-[32px]">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-[14px] leading-relaxed text-white/25">
                    {featured.excerpt}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-normal text-indigo-300">
                      {featured.authorInitials}
                    </div>
                    <div>
                      <p className="text-[12px] font-normal text-white">{featured.author}</p>
                      <p className="text-[11px] text-white/25">{featured.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/25">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[12px]">{featured.readTime} lectura</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-[#111116]/10 px-4 py-2 text-[13px] font-normal text-white group-hover:bg-[#111116]/20 transition-colors">
                    Leer artículo <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Post grid ─────────────────────────────────────────────── */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-white/[0.05] bg-[#111116] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-white/[0.07] hover:shadow-md"
              >
                <span className={`mb-3 inline-block self-start rounded-full px-2.5 py-1 text-[11px] font-normal ${post.tagColor}`}>
                  {post.tag}
                </span>
                <h3 className="mb-2 text-[16px] font-normal leading-snug text-white/85 group-hover:text-indigo-400/60 transition-colors flex-1">
                  {post.title}
                </h3>
                <p className="mb-5 text-[13px] leading-relaxed text-white/35 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-normal text-white/45">
                      {post.authorInitials}
                    </div>
                    <span className="text-[12px] text-white/35">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/25">
                    <Clock className="h-3 w-3" />
                    <span className="text-[11px]">{post.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Newsletter CTA */}
          <div className="mt-16 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-10 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-indigo-400" />
            <h3 className="text-[22px] font-normal tracking-tight text-white/85">
              Recibe los mejores artículos en tu inbox
            </h3>
            <p className="mt-2 text-[14px] text-white/35">
              Sin spam. Solo contenido útil sobre pagos, fintech y producto.
            </p>
            <form className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="tu@empresa.com"
                className="flex-1 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-2.5 text-[14px] text-white/85 outline-none placeholder:text-white/25 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#16161e] px-5 py-2.5 text-[13px] font-normal text-white hover:bg-[#1a1a1a] transition-colors"
              >
                Suscribirme
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
