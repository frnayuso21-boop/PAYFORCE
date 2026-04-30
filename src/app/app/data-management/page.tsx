"use client";
import { useState } from "react";
import { Database, Download, Trash2, Upload, Shield, RefreshCw } from "lucide-react";

export default function DataManagementPage() {
 const [exporting, setExporting] = useState(false);

 async function handleExport(type: "payments"| "customers"| "subscriptions") {
 setExporting(true);
 try {
 const r = await fetch(`/api/export/${type}`);
 if (!r.ok) throw new Error("Error");
 const blob = await r.blob();
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `payforce_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 } catch {
 alert("Error al exportar. Inténtalo de nuevo.");
 } finally {
 setExporting(false);
 }
 }

 const EXPORTS = [
 { type: "payments"as const, label: "Exportar Pagos", desc: "CSV con todos tus pagos y transacciones", icon: Download },
 { type: "customers"as const, label: "Exportar Clientes", desc: "CSV con el directorio completo de clientes", icon: Download },
 { type: "subscriptions"as const, label: "Exportar Suscripciones",desc: "CSV con suscripciones y estado de facturación",icon: Download },
 ];

 return (
 <div className="min-h-screen bg-[#f8f9fb] p-8">
 <div className="mb-7">
 <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
 <Database className="h-5 w-5 text-slate-400"/> Gestión de Datos
 </h1>
 <p className="text-[13px] text-slate-400 mt-0.5">Exporta, importa y gestiona los datos de tu cuenta</p>
 </div>

 <div className="grid grid-cols-1 gap-4 max-w-2xl mb-8">
 <h2 className="text-[13px] font-semibold text-slate-600 uppercase tracking-wide">Exportar datos</h2>
 {EXPORTS.map((e) => {
 const Icon = e.icon;
 return (
 <div key={e.type} className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
 <Icon className="h-5 w-5 text-slate-500"/>
 </div>
 <div className="flex-1">
 <p className="font-semibold text-slate-900 text-[13px]">{e.label}</p>
 <p className="text-[12px] text-slate-400">{e.desc}</p>
 </div>
 <button
 onClick={() => handleExport(e.type)}
 disabled={exporting}
 className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
 {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <Download className="h-3.5 w-3.5"/>}
 CSV
 </button>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-2 gap-4 max-w-2xl">
 <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
 <div className="flex items-center gap-2 mb-3">
 <Shield className="h-4 w-4 text-blue-500"/>
 <h2 className="text-[13px] font-semibold text-slate-900">Privacidad de datos</h2>
 </div>
 <p className="text-[12px] text-slate-500 mb-3">
 Todos tus datos están almacenados de forma segura y cifrada. PayForce cumple con el RGPD.
 </p>
 <button className="text-[12px] font-medium text-blue-600 hover:underline">
 Ver política de privacidad →
 </button>
 </div>

 <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
 <div className="flex items-center gap-2 mb-3">
 <Trash2 className="h-4 w-4 text-red-500"/>
 <h2 className="text-[13px] font-semibold text-red-700">Eliminar cuenta</h2>
 </div>
 <p className="text-[12px] text-red-500 mb-3">
 Esta acción es irreversible. Todos tus datos y transacciones serán eliminados permanentemente.
 </p>
 <button className="text-[12px] font-medium text-red-600 hover:underline">
 Solicitar eliminación →
 </button>
 </div>
 </div>
 </div>
 );
}
