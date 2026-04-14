import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Target, Lightbulb, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Quiénes somos — PayForce",
  description:
    "Conoce el equipo detrás de PayForce, nuestra misión y los valores que guían nuestra tecnología de pagos.",
};

// ─── Datos ────────────────────────────────────────────────────────────────────

const values = [
  {
    icon: Target,
    title: "Claridad",
    desc: "Transparencia total en precios, comisiones y condiciones. Sin letra pequeña, sin sorpresas en la factura.",
  },
  {
    icon: Heart,
    title: "Obsesión por el cliente",
    desc: "Cada decisión de producto se toma pensando en qué necesita realmente el negocio que confía en nosotros.",
  },
  {
    icon: Lightbulb,
    title: "Innovación continua",
    desc: "El mundo de los pagos cambia rápido. Estamos siempre en la frontera, adoptando nuevos estándares antes que nadie.",
  },
  {
    icon: Users,
    title: "Equipo primero",
    desc: "Construimos un lugar donde las personas talentosas quieren trabajar y crecer. Un equipo feliz hace un producto mejor.",
  },
];

const team = [
  {
    name: "Alejandro Ruiz",
    role: "CEO & Co-Fundador",
    bio: "Ex-Cabify y ex-N26. 10 años construyendo infraestructura financiera en Europa y Latinoamérica.",
    initials: "AR",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    name: "Laura Méndez",
    role: "CTO & Co-Fundadora",
    bio: "Ingeniera de sistemas distribuidos. Lideró el equipo de pagos en Glovo antes de fundar PayForce.",
    initials: "LM",
    color: "bg-violet-100 text-violet-700",
  },
  {
    name: "Carlos Soto",
    role: "CPO",
    bio: "Diseñador de producto con obsesión por la UX. Ex-Revolut, especializado en experiencias financieras.",
    initials: "CS",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Marta Iglesias",
    role: "Head of Compliance",
    bio: "Experta en regulación PSD2, PCI DSS y normativa bancaria europea. Ex-Santander y ex-BBVA.",
    initials: "MI",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "David Torres",
    role: "Lead Engineer",
    bio: "Arquitecto de microservicios con experiencia en sistemas de alta disponibilidad. Ex-Amazon Payments.",
    initials: "DT",
    color: "bg-amber-100 text-amber-700",
  },
  {
    name: "Ana Castillo",
    role: "Head of Sales",
    bio: "Especialista en ventas enterprise fintech. Ha cerrado contratos con más de 200 merchants en Europa.",
    initials: "AC",
    color: "bg-rose-100 text-rose-700",
  },
];

const milestones = [
  { year: "2021", text: "Fundación de PayForce en Madrid con un equipo de 4 personas." },
  { year: "2022", text: "Lanzamiento de la beta privada. Primeros 50 merchants activos." },
  { year: "2023", text: "Serie A de 8M€. Expansión a Portugal, Francia e Italia." },
  { year: "2024", text: "Superamos los 10.000 merchants activos y 500M€ en volumen anual." },
  { year: "2025", text: "Lanzamiento de la plataforma multi-merchant y API pública." },
  { year: "2026", text: "Más de 12M€ procesados al mes. Próxima expansión a LATAM." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
              Quiénes somos
            </p>
            <h1 className="text-[40px] font-normal leading-[1.1] tracking-tight text-white/85 md:text-[54px]">
              Construimos la infraestructura financiera del futuro
            </h1>
            <p className="mt-6 text-[17px] leading-relaxed text-white/35">
              PayForce nació con una misión clara: democratizar el acceso a una infraestructura de pagos de grado bancario para cualquier empresa, sin importar su tamaño.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="bg-[#16161e] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400">
                Nuestra misión
              </p>
              <h2 className="text-[34px] font-normal tracking-tight text-white md:text-[42px]">
                Payments sin fricciones para todos
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-white/25">
                En el mundo actual, aceptar un pago debería ser tan sencillo como enviar un mensaje. Sin formularios interminables, sin esperas de semanas, sin comisiones ocultas.
              </p>
              <p className="mt-4 text-[16px] leading-relaxed text-white/25">
                Por eso construimos PayForce: para que cualquier empresa, desde una startup hasta un grupo empresarial, tenga acceso a la misma tecnología que usan los grandes bancos, sin el coste ni la complejidad.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "2021",   label: "Año de fundación"  },
                { value: "+500",   label: "Merchants activos" },
                { value: "500M€",  label: "Volumen anual"     },
                { value: "8",      label: "Países europeos"   },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-[#111116]/5 p-6 text-center"
                >
                  <p className="text-[34px] font-normal text-white">{stat.value}</p>
                  <p className="mt-1 text-[12px] text-white/25">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
              Valores
            </p>
            <h2 className="text-[32px] font-normal tracking-tight text-white/85 md:text-[38px]">
              Lo que nos define como empresa
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/[0.05] bg-[#111116] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#16161e] text-white/60">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-normal text-white/85">{v.title}</h3>
                <p className="text-[13px] leading-relaxed text-white/35">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.05] bg-[#111116] py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
              Historia
            </p>
            <h2 className="text-[32px] font-normal tracking-tight text-white/85 md:text-[38px]">
              Del garaje a los 500M€
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 md:left-1/2" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div
                  key={m.year}
                  className={`relative flex gap-6 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  {/* Year badge */}
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500 bg-[#111116] md:absolute md:left-1/2 md:-translate-x-1/2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  </div>
                  {/* Content */}
                  <div
                    className={`flex-1 md:w-[calc(50%-32px)] ${
                      i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12 md:ml-[calc(50%+32px)]"
                    }`}
                  >
                    <div className="rounded-xl border border-white/[0.05] bg-[#111116] p-5 shadow-sm">
                      <span className="text-[12px] font-normal text-indigo-400/60">{m.year}</span>
                      <p className="mt-1 text-[14px] text-white/45">{m.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" id="team">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
              Equipo
            </p>
            <h2 className="text-[32px] font-normal tracking-tight text-white/85 md:text-[38px]">
              Las personas detrás de PayForce
            </h2>
            <p className="mt-4 text-[15px] text-white/35">
              Un equipo multidisciplinar con experiencia en fintech, banca y producto digital.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border border-white/[0.05] bg-[#111116] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-[15px] font-normal ${member.color}`}>
                  {member.initials}
                </div>
                <h3 className="text-[15px] font-normal text-white/85">{member.name}</h3>
                <p className="mt-0.5 text-[12px] font-normal text-white/25">{member.role}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/35">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section className="pb-24" id="contact">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 p-10 md:p-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-[12px] font-normal uppercase tracking-widest text-indigo-400/60">
                Contacto
              </p>
              <h2 className="text-[32px] font-normal tracking-tight text-white/85 md:text-[38px]">
                ¿Hablamos?
              </h2>
              <p className="mt-4 text-[16px] text-white/35">
                Si quieres saber más sobre PayForce, integrar nuestra plataforma o simplemente saludar, escríbenos. Respondemos en menos de 24 horas.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:hola@payforce.dev"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#16161e] px-6 py-3 text-[14px] font-normal text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  hola@payforce.dev <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#111116] px-6 py-3 text-[14px] font-normal text-white/60 hover:border-slate-300 transition-colors"
                >
                  Crear cuenta gratis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
