import type { Metadata } from "next";
import Link from "next/link";
import { PayForceLogo } from "@/components/marketing/PayForceLogo";
import { Check, ArrowLeft, Lock, Shield, Headphones } from "lucide-react";
import { mockPlans } from "@/mock";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./CheckoutButton";

export const metadata: Metadata = { title: "Checkout — PayForce" };

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}


export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params   = await searchParams;
  const planId   = params.plan ?? "pro";
  const selected = mockPlans.find((p) => p.id === `plan_${planId}`) ?? mockPlans[1];

  return (
    <div className="min-h-screen bg-[#efefef]">

      {/* ── Topbar — mismo estilo que el dashboard ──────────────────────────── */}
      <header className="bg-white border-b border-slate-100">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <PayForceLogo height={28} />
          <Link
            href="/app/dashboard"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al dashboard
          </Link>
        </div>
      </header>

      {/* ── Contenido ────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── LEFT ─────────────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Card: selector de planes */}
            <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Selecciona un plan
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  14 días de prueba gratuita incluidos en todos los planes.
                </p>
              </div>
              <div className="p-4 space-y-3">
                {mockPlans.map((plan) => {
                  const isSelected = plan.id === selected.id;
                  return (
                    <Link
                      key={plan.id}
                      href={`/checkout?plan=${plan.id.replace("plan_", "")}`}
                      className={cn(
                        "flex items-start gap-4 rounded-xl border p-4 transition-all duration-200",
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      {/* Radio */}
                      <div className="mt-0.5 shrink-0">
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300"
                        )}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
                          {plan.popular && (
                            <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                          {plan.features.map((feat) => (
                            <div key={feat} className="flex items-start gap-1.5">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                              <span className="text-xs text-slate-500">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Precio */}
                      <div className="shrink-0 text-right">
                        <span className="text-base font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(plan.price, plan.currency)}
                        </span>
                        <p className="text-[11px] text-slate-400">/mes</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Card: botón de pago */}
            <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Confirmar suscripción
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Serás redirigido al proceso de pago seguro
                </p>
              </div>
              <div className="p-6">
                <CheckoutButton plan={selected.id.replace("plan_", "")} planName={selected.name} />
              </div>
            </div>
          </div>

          {/* ── RIGHT ────────────────────────────────────────────────────────── */}
          <div>
            <div className="sticky top-6 space-y-4">

              {/* Card: resumen */}
              <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">Resumen del pedido</h2>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Plan {selected.name}</span>
                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                      {formatCurrency(selected.price, selected.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Prueba gratuita (14 días)</span>
                    <span className="text-sm font-medium text-emerald-600 tabular-nums">
                      −{formatCurrency(selected.price, selected.currency)}
                    </span>
                  </div>
                </div>

                <div className="mx-5 border-t border-slate-100" />

                <div className="px-5 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-900">Total hoy</span>
                    <span className="text-xl font-semibold text-slate-900 tabular-nums">0,00 €</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                    Se cobrará {formatCurrency(selected.price, selected.currency)}/mes
                    a partir del día 15. Cancela en cualquier momento.
                  </p>
                </div>

                <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3 text-slate-300" />
                  <span className="text-[11px] text-slate-400">Pago seguro con PayForce</span>
                </div>
              </div>

              {/* Card: garantías */}
              <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {[
                    { icon: Shield,      text: "Sin permanencia · cancela cuando quieras" },
                    { icon: Lock,        text: "Pagos procesados por PayForce" },
                    { icon: Headphones,  text: "Soporte en español incluido" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 px-5 py-3">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-500">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Powered by PayForce */}
              <div className="flex items-center justify-center pt-1">
                <span className="mr-1.5 text-[11px] text-slate-400">Powered by</span>
                <PayForceLogo height={14} />
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
