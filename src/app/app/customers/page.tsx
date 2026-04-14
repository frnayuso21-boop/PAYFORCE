"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Download, MoreHorizontal, Users, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { CreateCustomerModal } from "@/components/customers/CreateCustomerModal";

interface CustomerRow {
  id:            string;
  name:          string;
  email:         string;
  totalSpend:    number;
  currency:      string;
  paymentCount:  number;
  lastPaymentAt: string | null;
}

function initials(name: string) {
  return getInitials(name) || name.slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function CustomersPage() {
  const [customers,    setCustomers]    = useState<CustomerRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState<CustomerRow | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);

  function loadCustomers() {
    setLoading(true);
    fetch("/api/customers?limit=100")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setCustomers(data.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden -m-6 lg:-m-8">

      {/* ══ PANEL IZQUIERDO ══ */}
      <div className="flex w-[320px] shrink-0 flex-col border-r border-slate-100 bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <h1 className="text-[15px] font-semibold text-slate-900">Clientes</h1>
          <div className="flex items-center gap-1.5">
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-3 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                  <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 bg-slate-100 animate-pulse rounded" />
                    <div className="h-2 w-36 bg-slate-100 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-2">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="text-[13px] font-medium text-slate-400">Sin clientes</p>
              <p className="text-[11px] text-slate-300 text-center px-6">
                {search ? "No hay resultados para tu búsqueda" : "Los clientes aparecerán aquí cuando completen pagos"}
              </p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 hover:bg-slate-50 ${
                  selected?.id === c.id ? "bg-slate-50" : ""
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarColor(c.name)}`}>
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(c.totalSpend / 100, c.currency)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {c.paymentCount} pago{c.paymentCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer con total */}
        {!loading && customers.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{customers.length} cliente{customers.length !== 1 ? "s" : ""}</span>
            <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
              {formatCurrency(customers.reduce((s, c) => s + c.totalSpend, 0) / 100, customers[0]?.currency ?? "eur")}
            </span>
          </div>
        )}
      </div>

      {/* ══ PANEL DERECHO ══ */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        {selected ? (
          /* ── Detalle del cliente ── */
          <div className="max-w-2xl mx-auto p-8 space-y-6">

            {/* Header cliente */}
            <div className="flex items-start gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0 ${avatarColor(selected.name)}`}>
                {initials(selected.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[20px] font-semibold text-slate-900 leading-tight">{selected.name}</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">{selected.email}</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
                <ArrowUpRight className="h-3.5 w-3.5" /> Ver pagos
              </button>
            </div>

            {/* KPIs del cliente */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total gastado",   value: formatCurrency(selected.totalSpend / 100, selected.currency) },
                { label: "Pagos realizados", value: String(selected.paymentCount)                               },
                { label: "Último pago",     value: selected.lastPaymentAt ? formatDate(selected.lastPaymentAt) : "Sin pagos" },
              ].map(k => (
                <div key={k.label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{k.label}</p>
                  <p className="text-[20px] font-semibold text-slate-900 mt-1 tabular-nums leading-tight">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <p className="text-[12px] font-semibold text-slate-700">Información</p>
              </div>
              {[
                { label: "Email",       value: selected.email },
                { label: "Nombre",      value: selected.name  },
                { label: "Divisa",      value: selected.currency.toUpperCase() },
                { label: "Tipo",        value: selected.paymentCount > 1 ? "Recurrente" : "Único" },
              ].map((row, i) => (
                <div key={row.label} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-slate-50" : ""}`}>
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                  <span className="text-[12px] font-medium text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-slate-700">
                {customers.length === 0 ? "Sin clientes" : "Selecciona un cliente"}
              </p>
              <p className="text-[13px] text-slate-400 mt-1">
                {customers.length === 0
                  ? "Los clientes aparecerán cuando completen un pago"
                  : "Haz clic en un cliente para ver sus detalles"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal crear cliente ── */}
      <CreateCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); loadCustomers(); }}
      />
    </div>
  );
}
