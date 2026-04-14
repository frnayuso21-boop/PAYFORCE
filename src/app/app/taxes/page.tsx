import { Scale, Info } from "lucide-react";

const TAX_INFO = [
  {
    label: "IVA General",
    rate:  "21%",
    desc:  "Aplicable a la mayoría de productos y servicios en España",
    color: "bg-blue-50 border-blue-200",
  },
  {
    label: "IVA Reducido",
    rate:  "10%",
    desc:  "Alimentación, hostelería, transporte de viajeros, etc.",
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    label: "IVA Superreducido",
    rate:  "4%",
    desc:  "Pan, leche, libros, medicamentos, prótesis…",
    color: "bg-amber-50 border-amber-200",
  },
  {
    label: "IRPF (Retención)",
    rate:  "15%",
    desc:  "Aplicable a profesionales autónomos en facturas B2B",
    color: "bg-violet-50 border-violet-200",
  },
];

export default function TaxesPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <Scale className="h-5 w-5 text-slate-400" /> Impuestos
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Configuración de tipos impositivos y cumplimiento fiscal</p>
      </div>

      <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-700 leading-relaxed">
          PayForce aplica los impuestos según la configuración de tus productos en Stripe.
          Consulta a tu asesor fiscal para configurar correctamente los tipos impositivos
          según tu actividad y país de operación.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {TAX_INFO.map((t) => (
          <div key={t.label} className={`rounded-2xl border p-5 ${t.color}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-900 text-[14px]">{t.label}</p>
              <span className="text-[20px] font-bold text-slate-900">{t.rate}</span>
            </div>
            <p className="text-[12px] text-slate-500">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Próximamente</h2>
        <ul className="space-y-3 text-[13px] text-slate-500">
          {[
            "Configuración automática de IVA por producto",
            "Exportación de declaraciones periódicas (Modelo 303, 390)",
            "Integración con software de contabilidad (Holded, Sage, Contasol)",
            "Generación automática de facturas con IVA desglosado",
            "Soporte multi-país (EU VAT, UK VAT)",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
