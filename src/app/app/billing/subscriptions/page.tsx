import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";

export default function BillingSubscriptionsPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-6">
        <Link href="/app/billing" className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-700 transition mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Billing
        </Link>
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-slate-400" /> Suscripciones de clientes
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Gestiona las suscripciones desde aquí o desde la sección Suscripciones</p>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm text-center">
        <RefreshCw className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-slate-500">Redirigiendo a Suscripciones…</p>
        <p className="text-[12px] text-slate-400 mt-1 mb-4">Gestiona todo desde la sección centralizada de suscripciones</p>
        <Link href="/app/subscriptions"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-700 transition">
          Ir a Suscripciones →
        </Link>
      </div>
    </div>
  );
}
