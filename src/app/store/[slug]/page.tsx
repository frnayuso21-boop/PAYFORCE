import type { Metadata } from "next";
import { notFound }     from "next/navigation";
import { db }           from "@/lib/db";
import { HexLogo }      from "@/components/icons/HexLogo";
import { StoreCheckout } from "./StoreCheckout";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

// ─── Metadata dinámica ────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const account = await getStore(slug);
  if (!account) return { title: "Tienda no encontrada · PayForce" };
  return {
    title:       `${account.businessName || slug} · PayForce`,
    description: account.storeDescription ?? `Paga en ${account.businessName}`,
  };
}

// ─── Helper BD ────────────────────────────────────────────────────────────────

async function getStore(slug: string) {
  return db.connectedAccount.findUnique({
    where:  { slug: slug.toLowerCase() },
    select: {
      id:               true,
      businessName:     true,
      country:          true,
      defaultCurrency:  true,
      storeDescription: true,
      primaryColor:     true,
      storeEnabled:     true,
      slug:             true,
      chargesEnabled:   true,
    },
  });
}

// ─── Componente de iniciales ──────────────────────────────────────────────────

function BusinessAvatar({
  name, color, size = 72,
}: { name: string; color: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{ width: size, height: size, background: color, borderRadius: "22px" }}
      className="flex items-center justify-center shrink-0 shadow-lg"
    >
      <span style={{ fontSize: size * 0.38, color: "#ffffff", fontWeight: 800 }}>
        {initials || "?"}
      </span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const account  = await getStore(slug);

  if (!account) notFound();
  if (!account.storeEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-sm">
          <p className="text-[20px] font-bold text-slate-800 mb-2">Tienda no disponible</p>
          <p className="text-sm text-slate-400">Esta tienda está temporalmente desactivada.</p>
          <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-slate-400">
            <HexLogo size={14} className="text-slate-300" />
            <span>PayForce</span>
          </div>
        </div>
      </div>
    );
  }

  const color       = account.primaryColor ?? "#0f172a";
  const bizName     = account.businessName || slug;
  const description = account.storeDescription ?? "";
  const currency    = account.defaultCurrency ?? "eur";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Cabecera de la tienda ──────────────────────────────────────────── */}
      <header
        style={{ background: color }}
        className="px-6 py-10 text-white"
      >
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <BusinessAvatar name={bizName} color="rgba(255,255,255,0.15)" size={64} />
            <div>
              <p className="text-[22px] font-extrabold leading-tight">{bizName}</p>
              {account.slug && (
                <p className="text-[12px] opacity-60 mt-0.5">
                  {account.slug}.payforce.io
                </p>
              )}
            </div>
          </div>
          {description && (
            <p className="text-[14px] leading-relaxed opacity-80">{description}</p>
          )}
        </div>
      </header>

      {/* ── Formulario de pago ────────────────────────────────────────────── */}
      <main className="mx-auto max-w-md px-6 py-8">
        {account.chargesEnabled ? (
          <StoreCheckout
            slug={slug}
            currency={currency}
            primaryColor={color}
          />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
            <p className="text-[15px] font-semibold text-amber-800 mb-1">
              Pagos no disponibles
            </p>
            <p className="text-[13px] text-amber-700">
              Este comercio está configurando su cuenta de cobros.
              Inténtalo de nuevo pronto.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-4 pb-10 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <HexLogo size={12} className="text-slate-300" />
          <span>Pagos seguros procesados por <strong className="text-slate-500">PayForce</strong></span>
        </div>
      </footer>
    </div>
  );
}
