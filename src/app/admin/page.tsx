"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users, CreditCard, Zap, AlertTriangle,
  TrendingUp, Euro, RefreshCw, Clock,
} from "lucide-react";

type Stats = {
  merchants:          { total: number; active: number };
  payments:           { total: number; month: number };
  revenue:            { total: number; month: number };
  fees:               { total: number; month: number };
  pendingPayouts:     number;
  openDisputes:       number;
  totalSubscriptions: number;
  recentPayments: {
    id: string; amount: number; currency: string; createdAt: string;
    connectedAccount: { businessName: string; email: string };
    customer: { name: string; email: string } | null;
  }[];
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function StatCard({
  label, value, sub, icon: Icon, accent = "text-slate-900",
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 px-6 py-5 flex items-start gap-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div>
        <p className="text-[12px] text-slate-400 font-medium">{label}</p>
        <p className={`text-[22px] font-bold ${accent}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/stats");
      if (r.ok) setStats(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Panel de Control</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Visión global de la plataforma PayForce</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] text-white hover:bg-slate-700 transition">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      )}

      {!loading && stats && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
            <StatCard
              icon={Users} label="Merchants" accent="text-slate-700"
              value={String(stats.merchants.total)}
              sub={`${stats.merchants.active} activos`}
            />
            <StatCard
              icon={TrendingUp} label="Ingresos totales" accent="text-emerald-600"
              value={fmt(stats.revenue.total)}
              sub={`${fmt(stats.revenue.month)} este mes`}
            />
            <StatCard
              icon={Euro} label="Comisiones plataforma" accent="text-blue-600"
              value={fmt(stats.fees.total)}
              sub={`${fmt(stats.fees.month)} este mes`}
            />
            <StatCard
              icon={CreditCard} label="Pagos procesados" accent="text-slate-700"
              value={String(stats.payments.total)}
              sub={`${stats.payments.month} este mes`}
            />
          </div>

          {/* Alertas */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-2xl border px-6 py-4 flex items-center gap-4 ${
              stats.pendingPayouts > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}>
              <Zap className={`h-5 w-5 shrink-0 ${stats.pendingPayouts > 0 ? "text-amber-500" : "text-slate-300"}`} />
              <div>
                <p className="text-[12px] text-slate-400">Instant Payouts pendientes</p>
                <p className={`text-[20px] font-bold ${stats.pendingPayouts > 0 ? "text-amber-600" : "text-slate-300"}`}>
                  {stats.pendingPayouts}
                </p>
              </div>
              {stats.pendingPayouts > 0 && (
                <a href="/admin/payouts"
                  className="ml-auto text-[12px] font-semibold text-amber-600 hover:underline">
                  Gestionar →
                </a>
              )}
            </div>
            <div className={`rounded-2xl border px-6 py-4 flex items-center gap-4 ${
              stats.openDisputes > 0
                ? "bg-red-50 border-red-200"
                : "bg-white border-slate-200"
            }`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${stats.openDisputes > 0 ? "text-red-500" : "text-slate-300"}`} />
              <div>
                <p className="text-[12px] text-slate-400">Disputas abiertas</p>
                <p className={`text-[20px] font-bold ${stats.openDisputes > 0 ? "text-red-600" : "text-slate-300"}`}>
                  {stats.openDisputes}
                </p>
              </div>
              {stats.openDisputes > 0 && (
                <a href="/admin/disputes"
                  className="ml-auto text-[12px] font-semibold text-red-600 hover:underline">
                  Ver disputas →
                </a>
              )}
            </div>
          </div>

          {/* Últimos pagos */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Pagos recientes
              </h2>
              <a href="/admin/payments" className="text-[12px] text-slate-400 hover:text-slate-700 transition">
                Ver todos →
              </a>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Importe</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-700 font-medium">
                      {p.connectedAccount.businessName || p.connectedAccount.email}
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {p.customer ? p.customer.name || p.customer.email : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-900">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
                {stats.recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-300">
                      Sin pagos recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
