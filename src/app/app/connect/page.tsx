import type { Metadata }  from "next";
import Link               from "next/link";
import { redirect }       from "next/navigation";
import {
  ArrowRight, CheckCircle2, Circle, Link2,
  Zap, CreditCard, TrendingUp, ShieldCheck,
} from "lucide-react";
import { MobileHeader }   from "@/components/mobile/MobileHeader";
import { Button }         from "@/components/ui/button";
import { Badge }          from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db }             from "@/lib/db";
import { stripe }         from "@/lib/stripe";
import { resolveConnectStatus } from "@/lib/connect";
import { formatDate }     from "@/lib/utils";
import { EmbeddedNotificationBanner } from "@/components/connect/EmbeddedNotificationBanner";
import { SyncStatusButton } from "@/components/connect/SyncStatusButton";

export const metadata: Metadata = { title: "Cobros — PayForce" };
export const dynamic = "force-dynamic";

const statusVariant: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  NOT_CONNECTED: "secondary",
  PENDING:       "warning",
  RESTRICTED:    "warning",
  ENABLED:       "success",
  REJECTED:      "destructive",
};
const statusLabel: Record<string, string> = {
  NOT_CONNECTED: "No activada",
  PENDING:       "Verificación pendiente",
  RESTRICTED:    "Acción requerida",
  ENABLED:       "Activa",
  REJECTED:      "Rechazada",
};

export default async function ConnectPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await db.user.findUnique({
    where:   { supabaseId: user.id },
    include: { connectedAccounts: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  let account = dbUser?.connectedAccounts[0] ?? null;

  // ── Sync automático con Stripe al cargar la página ─────────────────────────
  if (account && !account.stripeAccountId.startsWith("local_")) {
    try {
      const sa = await stripe.accounts.retrieve(account.stripeAccountId);
      const freshStatus = resolveConnectStatus(sa);
      const changed =
        account.status           !== freshStatus ||
        account.chargesEnabled   !== (sa.charges_enabled   ?? false) ||
        account.payoutsEnabled   !== (sa.payouts_enabled   ?? false) ||
        account.detailsSubmitted !== (sa.details_submitted ?? false);
      if (changed) {
        account = await db.connectedAccount.update({
          where: { id: account.id },
          data: {
            status:           freshStatus,
            chargesEnabled:   sa.charges_enabled   ?? false,
            payoutsEnabled:   sa.payouts_enabled   ?? false,
            detailsSubmitted: sa.details_submitted ?? false,
          },
        });
      }
    } catch { /* Stripe no disponible — usar datos de BD */ }
  }

  // Sin cuenta — mostrar onboarding CTA
  if (!account || account.stripeAccountId.startsWith("local_")) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cuenta de cobros</h1>
          <p className="mt-1 text-sm text-slate-500">Activa tu cuenta para empezar a recibir pagos</p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-800">Cuenta de cobros no configurada</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
            Activa tu cuenta para recibir pagos de tus clientes directamente en tu banco.
          </p>
          <Button className="mt-6 gap-1.5" asChild>
            <Link href="/app/connect/onboarding">
              Activar cobros
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const capabilities = [
    { label: "Cobros habilitados",    enabled: account.chargesEnabled   },
    { label: "Pagos activos",         enabled: account.payoutsEnabled   },
    { label: "Identidad verificada",  enabled: account.detailsSubmitted },
    { label: "Cuenta activa",         enabled: account.status === "ENABLED" },
  ];

  const variant = statusVariant[account.status] ?? "secondary";
  const label   = statusLabel[account.status]   ?? account.status;
  const isActive = account.status === "ENABLED";

  return (
    <>
      <MobileHeader title="Cobros" />
      <div className="w-full max-w-2xl mx-auto space-y-4 px-4 pt-3 pb-6 md:px-0 md:space-y-6 md:py-2">

        {/* Título */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cuenta de cobros</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona tus cobros, payouts y verificación
          </p>
        </div>

        {/* Notification banner embebido — solo aparece si hay acciones pendientes */}
        <EmbeddedNotificationBanner />

        {/* Estado cuenta */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {account.businessName || account.email || "Mi cuenta de cobros"}
              </h2>
              {account.email && <p className="text-xs text-slate-400 mt-0.5">{account.email}</p>}
              <p className="text-xs text-slate-300 mt-0.5">
                ID: {account.stripeAccountId}
              </p>
            </div>
            <Badge variant={variant}>{label}</Badge>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 md:grid-cols-3">
            {[
              { label: "País",     value: account.country },
              { label: "Divisa",   value: (account.defaultCurrency ?? "EUR").toUpperCase() },
              { label: "Alta el",  value: formatDate(account.createdAt.toISOString()) },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="px-6 py-5 space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
              Estado de la cuenta
            </p>
            {capabilities.map((cap) => (
              <div key={cap.label} className="flex items-center gap-3">
                {cap.enabled
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle       className="h-4 w-4 text-slate-300 shrink-0" />
                }
                <span className={cap.enabled ? "text-sm text-slate-700" : "text-sm text-slate-400"}>
                  {cap.label}
                </span>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {isActive ? (
                <>
                  <Button variant="default" size="sm" className="gap-1.5" asChild>
                    <Link href="/app/payment-links">
                      <Link2 className="h-3.5 w-3.5" />
                      Crear enlace de pago
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/connect/payments">Ver pagos</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/connect/payouts">Balance y pagos</Link>
                  </Button>
                </>
              ) : (
                <Button variant="default" size="sm" className="gap-1.5" asChild>
                  <Link href="/app/connect/onboarding">
                    Completar verificación
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
            {/* Verificación manual con Stripe */}
            <SyncStatusButton />
          </div>
        </div>

        {/* Banner cuenta activa */}
        {isActive && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3 px-5 py-4">
            <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 flex-1">
              Tu cuenta está activa. Crea un enlace de pago para empezar a cobrar.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              asChild
            >
              <Link href="/app/payment-links">Ir a cobros</Link>
            </Button>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: CreditCard,
              title: "Pagos",
              desc: "Historial de cobros y reembolsos",
              href: "/app/connect/payments",
              disabled: !isActive,
            },
            {
              icon: TrendingUp,
              title: "Balance y payouts",
              desc: "Saldo disponible y retiradas",
              href: "/app/connect/payouts",
              disabled: !isActive,
            },
            {
              icon: ShieldCheck,
              title: "Disputas",
              desc: "Gestión de contracargos",
              href: "/app/connect/disputes",
              disabled: !isActive,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.disabled ? "#" : item.href}
                className={`rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
