"use client";
import { useState } from "react";
import { BookOpen, Download, RefreshCw, Calendar } from "lucide-react";

const REPORT_TYPES = [
  {
    id:    "monthly-summary",
    label: "Resumen mensual",
    desc:  "Ingresos, comisiones, número de transacciones y clientes del mes",
    icon:  "📊",
  },
  {
    id:    "transactions-detail",
    label: "Detalle de transacciones",
    desc:  "Listado completo de todos los pagos con estado y desglose",
    icon:  "📋",
  },
  {
    id:    "subscriptions-report",
    label: "Informe de suscripciones",
    desc:  "Estado de todas las suscripciones, renovaciones y cancelaciones",
    icon:  "🔄",
  },
  {
    id:    "disputes-report",
    label: "Informe de disputas",
    desc:  "Historial de contracargos, estado y resoluciones",
    icon:  "⚖️",
  },
  {
    id:    "payout-report",
    label: "Informe de liquidaciones",
    desc:  "Historial de pagos recibidos e instant payouts",
    icon:  "💸",
  },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [period,     setPeriod]     = useState("2024-01");

  async function generate(id: string) {
    setGenerating(id);
    await new Promise((r) => setTimeout(r, 1500));
    setGenerating(null);
    alert(`Informe "${REPORT_TYPES.find(r => r.id === id)?.label}" estará disponible próximamente.`);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-slate-400" /> Informes
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Genera y descarga informes detallados de tu actividad</p>
      </div>

      {/* Selector de período */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3.5 shadow-sm max-w-sm">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <label className="text-[12px] text-slate-500 shrink-0">Período:</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="flex-1 text-[13px] font-semibold text-slate-800 outline-none bg-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-2xl">
        {REPORT_TYPES.map((r) => (
          <div key={r.id}
            className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
            <span className="text-2xl shrink-0">{r.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-[13px]">{r.label}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{r.desc}</p>
            </div>
            <button
              onClick={() => generate(r.id)}
              disabled={generating === r.id}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60 transition"
            >
              {generating === r.id
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generando…</>
                : <><Download className="h-3.5 w-3.5" /> Descargar</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
