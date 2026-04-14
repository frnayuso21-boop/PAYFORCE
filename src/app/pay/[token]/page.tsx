import type { Metadata }       from "next";
import Link                   from "next/link";
import { notFound }           from "next/navigation";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, Lock, CreditCard, FileText,
} from "lucide-react";
import { db }                  from "@/lib/db";
import { stripe }              from "@/lib/stripe";
import { PayCheckout }         from "./PayCheckout";
import { TestPayCheckout }     from "./TestPayCheckout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { HexLogo }             from "@/components/icons/HexLogo";
import Image                   from "next/image";
import { PaySuccess }          from "./PaySuccess";

export const dynamic = "force-dynamic";

interface Props {
  params:       Promise<{ token: string }>;
  searchParams: Promise<{ redirect_status?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const link = await db.paymentLink.findUnique({
    where:   { token },
    include: { connectedAccount: { select: { businessName: true } } },
  });
  if (!link) return { title: "Link no encontrado · PayForce" };
  const biz = link.connectedAccount?.businessName;
  return {
    title: biz
      ? `${biz} · ${formatCurrency(link.amount / 100, link.currency)}`
      : `${formatCurrency(link.amount / 100, link.currency)} · PayForce`,
  };
}

// ─── Estado no disponible ─────────────────────────────────────────────────────

function LinkUnavailable({ status, amount, currency }: { status: string; amount?: number; currency?: string }) {
  const cfg: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
    paid: {
      icon:  <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
      title: "Pago completado",
      desc:  "Este enlace ya fue utilizado. El pago se procesó correctamente.",
    },
    expired: {
      icon:  <Clock className="h-12 w-12 text-amber-400" />,
      title: "Enlace expirado",
      desc:  "Este enlace de pago ha caducado. Solicita uno nuevo al remitente.",
    },
    canceled: {
      icon:  <XCircle className="h-12 w-12 text-slate-400" />,
      title: "Enlace cancelado",
      desc:  "Este enlace fue cancelado. Contacta con el remitente.",
    },
  };

  const c = cfg[status] ?? {
    icon:  <AlertTriangle className="h-12 w-12 text-red-400" />,
    title: "Enlace no disponible",
    desc:  "Este enlace no está disponible en este momento.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-2xl">
        <div className="mb-5 flex justify-center">{c.icon}</div>
        {amount !== undefined && (
          <p className="mb-1 text-3xl font-bold text-slate-900">
            {formatCurrency(amount / 100, currency ?? "eur")}
          </p>
        )}
        <p className="text-lg font-semibold text-slate-900">{c.title}</p>
        <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
        <div className="mt-6 flex items-center justify-center">
          <HexLogo size={20} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}

// PaySuccess → componente cliente animado en ./PaySuccess.tsx

// ─── Cabecera de solicitud (quien pide el pago) ───────────────────────────────

function RequestHeader({
  businessName, description, amount, currency, expiresAt, customerName, merchantLogoUrl,
}: {
  businessName: string; description?: string | null; amount: number; currency: string;
  expiresAt?: Date | null; customerName?: string | null; merchantLogoUrl?: string | null;
}) {
  const amountFmt = formatCurrency(amount / 100, currency);

  return (
    <div className="flex flex-col justify-between px-7 py-8 lg:w-[42%] lg:min-h-screen bg-slate-900">
      {/* Top */}
      <div>
        {/* Logo: merchant si tiene, si no PayForce hex solo */}
        <div className="mb-8">
          {merchantLogoUrl ? (
            <Image
              src={merchantLogoUrl}
              alt={businessName}
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <HexLogo size={28} className="text-white" />
          )}
        </div>

        {/* Quien solicita */}
        <div className="mb-8">
          <p className="text-[12px] font-medium uppercase tracking-widest text-white/40 mb-3">
            Solicitud de pago
          </p>

          {/* Avatar del merchant */}
          <div className="flex items-center gap-3 mb-5">
            {merchantLogoUrl ? (
              <Image
                src={merchantLogoUrl}
                alt={businessName}
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white">
                <HexLogo size={28} className="text-slate-900" />
              </div>
            )}
            <div>
              {businessName !== "PayForce" && (
                <p className="text-[18px] font-bold text-white leading-tight">{businessName}</p>
              )}
              <p className="text-[12px] text-white/40">te solicita un pago</p>
            </div>
          </div>

          {/* Importe */}
          <div className="rounded-2xl bg-white/8 border border-white/10 px-5 py-5 mb-4">
            <p className="text-[12px] text-white/40 mb-1">Total a pagar</p>
            <p className="text-[48px] font-extrabold tabular-nums text-white leading-none">
              {amountFmt}
            </p>
            {description && (
              <p className="mt-2 text-[14px] text-white/60">{description}</p>
            )}
          </div>

          {customerName && (
            <div className="flex items-center gap-2 text-[13px] text-white/40">
              <span>Para:</span>
              <span className="text-white/70 font-medium">{customerName}</span>
            </div>
          )}
          {expiresAt && (
            <div className="flex items-center gap-1.5 mt-2 text-[12px] text-white/30">
              <Clock className="h-3.5 w-3.5" />
              Válido hasta {formatDate(expiresAt.toISOString())}
            </div>
          )}
        </div>

        {/* Desglose */}
        <div className="space-y-2 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-white/40">Subtotal</span>
            <span className="text-white/70">{amountFmt}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-white/40">IVA incluido</span>
            <span className="text-white/70">—</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[14px] font-bold">
            <span className="text-white">Total</span>
            <span className="text-white">{amountFmt}</span>
          </div>
        </div>
      </div>

      {/* Bottom — seguridad */}
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/25">
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL 256-bit</span>
        <span>·</span>
        <span>3D Secure</span>
        <span>·</span>
        <span>Pago cifrado</span>
        <span>·</span>
        <span>PCI DSS</span>
      </div>
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default async function PayPage({ params, searchParams }: Props) {
  const { token }           = await params;
  const { redirect_status } = await searchParams;

  const link = await db.paymentLink.findUnique({
    where:   { token },
    include: {
      connectedAccount: {
        select: { businessName: true, email: true },
      },
    },
  });

  if (!link) notFound();

  // Comprobar expiración
  if (link.expiresAt && link.expiresAt < new Date() && link.status === "open") {
    await db.paymentLink.update({ where: { id: link.id }, data: { status: "expired" } });
    link.status = "expired";
  }

  // Verificar si ya está pagado
  let isPaid = link.status === "paid";
  if (!isPaid && redirect_status === "succeeded" && link.stripePaymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(link.stripePaymentIntentId);
      isPaid = pi.status === "succeeded";
    } catch { /* webhook lo resolverá */ }
  }

  const businessName    = link.connectedAccount?.businessName || "PayForce";
  const merchantLogoUrl = null; // activar tras ejecutar: npx prisma generate

  if (isPaid) {
    // Busca el Payment interno para el botón de factura
    let internalPaymentId: string | null = null;
    if (link.stripePaymentIntentId) {
      const dbPayment = await db.payment.findUnique({
        where:  { stripePaymentIntentId: link.stripePaymentIntentId },
        select: { id: true },
      });
      internalPaymentId = dbPayment?.id ?? null;
    }
    return (
      <PaySuccess
        amount={link.amount}
        currency={link.currency}
        description={link.description}
        businessName={businessName}
        customerName={link.customerName}
        paymentId={internalPaymentId}
      />
    );
  }

  if (link.status !== "open") {
    return (
      <LinkUnavailable
        status={link.status}
        amount={link.amount}
        currency={link.currency}
      />
    );
  }

  // ── Modo test: link generado sin Stripe Connect ────────────────────────────
  const isTestMode = link.stripePaymentIntentId?.startsWith("pi_test_") ?? false;

  if (isTestMode) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`;
    const payUrl  = `${baseUrl}/pay/${token}`;

    return (
      <div className="flex min-h-screen flex-col lg:flex-row">
        <RequestHeader
          businessName={businessName}
          description={link.description}
          amount={link.amount}
          currency={link.currency}
          expiresAt={link.expiresAt}
          customerName={link.customerName}
          merchantLogoUrl={merchantLogoUrl}
        />
        <div className="flex flex-1 flex-col justify-center bg-white px-6 py-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <TestPayCheckout
              token={token}
              amount={link.amount}
              currency={link.currency}
              description={link.description}
              businessName={businessName}
              payUrl={payUrl}
            />
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <HexLogo size={13} className="text-slate-400" />
              <span>Entorno de prueba</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Modo real: obtener / crear PaymentIntent en Stripe ────────────────────
  let clientSecret: string | null = null;
  try {
    if (link.stripePaymentIntentId) {
      const pi  = await stripe.paymentIntents.retrieve(link.stripePaymentIntentId);
      clientSecret = pi.client_secret;
    } else {
      const account = await db.connectedAccount.findUnique({
        where:  { id: link.connectedAccountId },
        select: { id: true, stripeAccountId: true },
      });
      if (!account || account.stripeAccountId.startsWith("local_")) {
        return <LinkUnavailable status="canceled" />;
      }

      const platformFee = Math.round(link.amount * 0.04) + 25;

      const pi = await stripe.paymentIntents.create({
        amount:        link.amount,
        currency:      link.currency,
        description:   link.description ?? undefined,
        receipt_email: link.customerEmail ?? undefined,
        application_fee_amount: platformFee,
        transfer_data: { destination: account.stripeAccountId },
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentLinkToken: link.token,
          stripeAccountId:  account.stripeAccountId,
          platformFee:      String(platformFee),
        },
      });
      await db.paymentLink.update({
        where: { id: link.id },
        data:  { stripePaymentIntentId: pi.id },
      });
      clientSecret = pi.client_secret;
    }
  } catch (err) {
    console.error("[pay/token]", err);
    return <LinkUnavailable status="canceled" />;
  }

  if (!clientSecret) return <LinkUnavailable status="canceled" />;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">

      {/* ── Panel izquierdo ─────────────────────────────────────────────── */}
      <RequestHeader
        businessName={businessName}
        description={link.description}
        amount={link.amount}
        currency={link.currency}
        expiresAt={link.expiresAt}
        customerName={link.customerName}
        merchantLogoUrl={merchantLogoUrl}
      />

      {/* ── Panel derecho (formulario) ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">

          {/* ── Cabecera compacta en móvil (QR scan) ─────────────────────────── */}
          <div className="lg:hidden mb-5">
            <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                  <HexLogo size={22} className="text-slate-900" />
                </div>
                <div>
                  {businessName !== "PayForce" && (
                    <p className="text-[13px] font-semibold text-white leading-tight">{businessName}</p>
                  )}
                  {link.description && (
                    <p className="text-[11px] text-white/40 leading-tight truncate max-w-[140px]">{link.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-extrabold text-white tabular-nums leading-none">
                  {formatCurrency(link.amount / 100, link.currency)}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">a pagar</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
              Elige cómo pagar
            </p>
          </div>

          {link.customerEmail && (
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Email de confirmación
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <input
                  type="email"
                  defaultValue={link.customerEmail}
                  readOnly
                  className="w-full bg-slate-50 px-4 py-3.5 text-[14px] text-slate-700 outline-none"
                />
              </div>
            </div>
          )}

          <PayCheckout
            clientSecret={clientSecret}
            token={token}
            amount={link.amount}
            currency={link.currency}
            description={link.description}
            customerEmail={link.customerEmail}
            customerName={link.customerName}
          />

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Lock className="h-3 w-3 text-slate-300" />
            <span>Pago seguro ·</span>
            <HexLogo size={14} className="text-slate-400" />
            <Link href="/" className="hover:underline text-slate-400">Privacidad</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
