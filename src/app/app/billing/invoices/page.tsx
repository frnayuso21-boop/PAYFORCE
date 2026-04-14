"use client";
import { useEffect, useState } from "react";
import { FileText, ArrowLeft, Download, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string; number: string | null; status: string;
  amount_due: number; amount_paid: number; currency: string;
  created: number; due_date: number | null;
  hosted_invoice_url: string | null; invoice_pdf: string | null;
  customer_name: string | null; customer_email: string | null;
};

function fmt(cents: number, currency = "eur") {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: currency.toUpperCase() });
}

const STATUS_STYLES: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-700",
  open:      "bg-blue-100 text-blue-600",
  draft:     "bg-slate-100 text-slate-500",
  uncollectible: "bg-red-100 text-red-600",
  void:      "bg-slate-100 text-slate-400",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <Link href="/app/billing" className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-700 transition mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Billing
        </Link>
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" /> Facturas
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Historial de facturas de tus clientes</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Nº Factura</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Cliente</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Importe</th>
                <th className="text-center px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Estado</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase">Fecha</th>
                <th className="px-6 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5 font-mono text-[12px] text-slate-500">
                    {inv.number || inv.id.slice(0, 12)}
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-slate-700">{inv.customer_name || "—"}</p>
                    <p className="text-[11px] text-slate-400">{inv.customer_email}</p>
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                    {fmt(inv.amount_due, inv.currency)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-400"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-400">
                    {new Date(inv.created * 1000).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {inv.invoice_pdf && (
                        <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-700 transition" title="Descargar PDF">
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-700 transition" title="Ver factura">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-300">Sin facturas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
