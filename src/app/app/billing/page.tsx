import Link from "next/link";
import { Receipt, RefreshCw, FileText, ArrowRight } from "lucide-react";

export default function BillingPage() {
 const sections = [
 {
 href: "/app/billing",
 icon: Receipt,
 label: "Resumen de facturación",
 desc: "Vista general de cobros, comisiones y facturación del período",
 active: true,
 },
 {
 href: "/app/billing/subscriptions",
 icon: RefreshCw,
 label: "Suscripciones",
 desc: "Gestiona todas las suscripciones activas de tus clientes",
 },
 {
 href: "/app/billing/invoices",
 icon: FileText,
 label: "Facturas",
 desc: "Descarga y gestiona todas las facturas generadas",
 },
 ];

 return (
 <div className="min-h-screen bg-[#f8f9fb] p-8">
 <div className="mb-7">
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <Receipt className="h-5 w-5 text-slate-400"/> Billing
 </h1>
 <p className="text-[13px] text-slate-400 mt-0.5">Facturación, suscripciones y facturas</p>
 </div>

 <div className="grid grid-cols-1 gap-3 max-w-2xl">
 {sections.map((s) => {
 const Icon = s.icon;
 return (
 <Link key={s.href} href={s.href}
 className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition group">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
 <Icon className="h-5 w-5 text-slate-500"/>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-slate-900 text-[14px]">{s.label}</p>
 <p className="text-[12px] text-slate-400 mt-0.5">{s.desc}</p>
 </div>
 <ArrowRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform"/>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
