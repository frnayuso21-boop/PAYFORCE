"use client";

import { useState } from "react";
import Link         from "next/link";
import { Plus, X, Link2, CreditCard, UserPlus, Smartphone, ScanLine, Phone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { label: "Cobro con QR",        description: "Genera un QR para cobrar",       href: "/app/payment-methods/qr", icon: Smartphone, highlight: true  },
  { label: "Cobro por teléfono",  description: "Introduce datos de tarjeta",      href: "/app/virtual-terminal",  icon: Phone,      highlight: false },
  { label: "Escanear código",     description: "Cobra por código de barras / QR", href: "/app/barcode",           icon: ScanLine,   highlight: false },
  { label: "Suscripción",         description: "Cobro recurrente automático",      href: "/app/subscriptions",     icon: RefreshCw,  highlight: false },
  { label: "Crear enlace de pago",description: "Comparte un link para cobrar",    href: "/app/payment-links",     icon: Link2,      highlight: false },
  { label: "Crear cliente",       description: "Añade un cliente al sistema",     href: "/app/customers?new=1",   icon: UserPlus,   highlight: false },
];

export function FloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[70] md:hidden transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <div className="mx-0 rounded-t-3xl bg-white px-4 pt-3 pb-4 shadow-2xl border-t border-slate-100">
          {/* Handle */}
          <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-200" />

          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-1">
            Acción rápida
          </p>

          <div className="space-y-1.5">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl px-4 py-3.5 transition-all active:scale-[0.98]",
                    action.highlight
                      ? "bg-slate-900 active:bg-slate-800"
                      : "bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    action.highlight
                      ? "bg-white/15 border-white/20"
                      : "bg-white border-slate-200"
                  )}>
                    <Icon className={cn("h-5 w-5", action.highlight ? "text-white" : "text-slate-700")} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[15px] font-semibold leading-tight",
                      action.highlight ? "text-white" : "text-slate-900"
                    )}>
                      {action.label}
                    </p>
                    <p className={cn(
                      "text-[12px] leading-tight mt-0.5",
                      action.highlight ? "text-white/50" : "text-slate-400"
                    )}>
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed right-4 z-[65] flex h-[54px] w-[54px] items-center justify-center rounded-full shadow-xl transition-all duration-200 active:scale-95 md:hidden",
          open ? "bg-slate-700" : "bg-slate-900",
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}
      >
        <div className={cn("transition-transform duration-200", open && "rotate-45")}>
          {open
            ? <X    className="h-6 w-6 text-white" />
            : <Plus className="h-6 w-6 text-white" />
          }
        </div>
      </button>
    </>
  );
}
