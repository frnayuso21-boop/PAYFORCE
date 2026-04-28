import Link from "next/link";
import { QrCode, Barcode, Phone, CreditCard, ArrowRight } from "lucide-react";

const METHODS = [
  {
    href:     "/app/payment-methods/qr",
    icon:     QrCode,
    label:    "Código QR",
    desc:     "Genera un QR que el cliente escanea con su móvil para pagar",
    badge:    null,
    color:    "bg-blue-50 border-blue-200 text-blue-600",
    iconBg:   "bg-blue-100",
  },
  {
    href:     "/app/barcode",
    icon:     Barcode,
    label:    "Código de Barras",
    desc:     "Escanea el código de barras de un producto para generar el cobro",
    badge:    null,
    color:    "bg-violet-50 border-violet-200 text-violet-600",
    iconBg:   "bg-violet-100",
  },
  {
    href:     "/dashboard/terminal",
    icon:     Phone,
    label:    "Cobro por teléfono (MOTO)",
    desc:     "Introduce los datos de la tarjeta del cliente en llamada para cobrar manualmente",
    badge:    "MOTO",
    color:    "bg-amber-50 border-amber-200 text-amber-600",
    iconBg:   "bg-amber-100",
  },
];

export default function PaymentMethodsPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-slate-400" /> Catálogo de Métodos de Pago
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Todos los canales de cobro disponibles en PayForce</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}
              className={`group relative flex items-start gap-4 rounded-2xl border p-6 transition-all hover:shadow-md ${m.color}`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-[14px]">{m.label}</p>
                  {m.badge && (
                    <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
