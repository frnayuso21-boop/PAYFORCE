"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { useCustomers } from "@/hooks/useDashboard";
import { Search, Plus, Download, Users, ArrowUpRight, RefreshCw, Mail, CreditCard, Calendar } from "lucide-react";
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

const AVATAR_COLORS = [
  { bg: "#EDE9FE", text: "#6D28D9" },
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#FFE4E6", text: "#9F1239" },
  { bg: "#CFFAFE", text: "#155E75" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmt(cents: number, currency = "eur") {
  return formatCurrency(cents / 100, currency);
}

function Sk({ w = "w-24", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} rounded-[5px] bg-[#F3F4F6] animate-pulse`} />;
}

const CUSTOMERS_KEY = "/api/customers?limit=100";

export default function CustomersPage() {
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<CustomerRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading: loading } = useCustomers(100);
  const customers: CustomerRow[] = data?.data ?? [];

  function loadCustomers() { void swrMutate(CUSTOMERS_KEY); }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

      {/* ── Panel izquierdo — lista ─────────────────────────────────────────── */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-[14px] font-semibold text-[#0A0A0A]">Clientes</h1>
            {!loading && (
              <p className="text-[11px] text-[#9CA3AF] mt-0.5 tabular-nums">
                {customers.length} cliente{customers.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadCustomers}
              className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex h-7 items-center gap-1 rounded-[7px] bg-[#0A0A0A] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1a1a1a] transition"
            >
              <Plus className="h-3 w-3" /> Nuevo
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-3 py-2.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-[#0A0A0A] placeholder-[#9CA3AF] outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6]">
                  <div className="h-8 w-8 rounded-full bg-[#F3F4F6] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk w="w-24" h="h-2.5" />
                    <Sk w="w-32" h="h-2" />
                  </div>
                  <Sk w="w-14" h="h-3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-2 px-4">
              <Users className="h-8 w-8 text-[#E5E7EB]" />
              <p className="text-[12px] font-medium text-[#6B7280] text-center">
                {search ? "Sin resultados" : "Sin clientes"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] text-center">
                {search
                  ? "Prueba con otro nombre o email"
                  : "Los clientes aparecerán cuando completen un pago"}
              </p>
            </div>
          ) : (
            filtered.map(c => {
              const av   = avatarColor(c.name);
              const isActive = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#F3F4F6] transition-colors ${
                    isActive ? "bg-[#F9FAFB]" : "hover:bg-[#F9FAFB]"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: av.bg, color: av.text }}
                  >
                    {initials(c.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#0A0A0A] truncate">{c.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{c.email}</p>
                  </div>
                  {/* Importe */}
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-[#0A0A0A] tabular-nums">
                      {fmt(c.totalSpend, c.currency)}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {c.paymentCount} pago{c.paymentCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer total */}
        {!loading && customers.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]">Total gastado</span>
            <span className="text-[12px] font-semibold text-[#0A0A0A] tabular-nums">
              {fmt(customers.reduce((s, c) => s + c.totalSpend, 0), customers[0]?.currency ?? "eur")}
            </span>
          </div>
        )}
      </div>

      {/* ── Panel derecho — detalle ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#F9FAFB]">
        {selected ? (
          <div className="max-w-xl mx-auto p-6 lg:p-8 space-y-4">

            {/* Header cliente */}
            <div className="rounded-[10px] border border-[#E5E7EB] bg-white px-6 py-5">
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
                  style={{ backgroundColor: avatarColor(selected.name).bg, color: avatarColor(selected.name).text }}
                >
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-semibold text-[#0A0A0A] leading-tight tracking-tight">
                    {selected.name}
                  </h2>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">{selected.email}</p>
                </div>
                <button className="flex items-center gap-1.5 rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Ver pagos
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "TOTAL GASTADO",
                  value: fmt(selected.totalSpend, selected.currency),
                  icon:  <CreditCard className="h-4 w-4 text-[#9CA3AF]" />,
                },
                {
                  label: "PAGOS",
                  value: String(selected.paymentCount),
                  icon:  <ArrowUpRight className="h-4 w-4 text-[#9CA3AF]" />,
                },
                {
                  label: "ÚLTIMO PAGO",
                  value: selected.lastPaymentAt ? formatDate(selected.lastPaymentAt) : "—",
                  icon:  <Calendar className="h-4 w-4 text-[#9CA3AF]" />,
                },
              ].map(k => (
                <div key={k.label} className="rounded-[10px] border border-[#E5E7EB] bg-white px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]">{k.label}</p>
                    {k.icon}
                  </div>
                  <p className="text-[18px] font-semibold text-[#0A0A0A] tabular-nums leading-none tracking-tight">
                    {k.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Información */}
            <div className="rounded-[10px] border border-[#E5E7EB] bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E7EB]">
                <p className="text-[12px] font-semibold text-[#0A0A0A]">Información del cliente</p>
              </div>
              {[
                { label: "Email",     value: selected.email,                          icon: <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" /> },
                { label: "Nombre",    value: selected.name,                           icon: <Users className="h-3.5 w-3.5 text-[#9CA3AF]" /> },
                { label: "Divisa",    value: selected.currency.toUpperCase(),         icon: null },
                { label: "Tipo",      value: selected.paymentCount > 1 ? "Recurrente" : "Único", icon: null },
              ].map((row, i) => (
                <div key={row.label}
                  className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-[#F3F4F6]" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    {row.icon}
                    <span className="text-[12px] text-[#6B7280]">{row.label}</span>
                  </div>
                  <span className="text-[12px] font-medium text-[#0A0A0A]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="h-12 w-12 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <Users className="h-5 w-5 text-[#9CA3AF]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-[#0A0A0A]">
                {customers.length === 0 ? "Sin clientes todavía" : "Selecciona un cliente"}
              </p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                {customers.length === 0
                  ? "Aparecerán aquí cuando completen un pago"
                  : "Haz clic en un cliente para ver sus detalles"}
              </p>
            </div>
            {customers.length === 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-2 text-[12px] font-medium text-[#0A0A0A] hover:bg-[#F9FAFB] transition"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir cliente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal crear cliente */}
      <CreateCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); loadCustomers(); }}
      />
    </div>
  );
}
