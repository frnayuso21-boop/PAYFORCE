"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertOctagon, RefreshCw, ArrowUpRight,
  CreditCard, Users, TrendingDown, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface FailedPayment {
  id: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customerEmail: string | null;
  customerName: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
}

interface FailedSubscription {
  id: string;
  externalRef: string;
  customerName: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
  batchJob: { id: string; createdAt: string };
  customer: { id: string; email: string; phone: string | null } | null;
}

interface ImpagosData {
  summary: {
    totalFailedAmount: number;
    totalFailedCount: number;
    failedPayments: number;
    failedSubscriptions: number;
    failureRate: number;
  };
  failedPayments:      { data: FailedPayment[];      total: number };
  failedSubscriptions: { data: FailedSubscription[]; total: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.ok ? r.json() : Promise.reject(r));

function fmtAmt(cents: number, currency = "eur") {
  return formatCurrency(cents / 100, currency.toUpperCase());
}

function FailureBadge({ code }: { code: string | null }) {
  const label = code ?? "error_desconocido";
  return (
    <span className="inline-flex items-center rounded-[6px] bg-red-50 px-2 py-0.5 text-[10px] text-red-700 font-medium">
      {label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, highlight = false,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-[10px] border bg-white p-5",
      highlight ? "border-red-200 bg-red-50" : "border-[#E5E7EB]",
    )}>
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF] mb-2">{label}</p>
      <p className={cn(
        "text-[26px] font-normal tracking-[-1px] leading-none",
        highlight ? "text-red-700" : "text-[#0A0A0A]",
      )}>{value}</p>
      {sub && <p className="text-[11px] mt-1 text-[#9CA3AF]">{sub}</p>}
    </div>
  );
}

// ─── Tabla Pagos Fallidos ─────────────────────────────────────────────────────
function PaymentsTable({ data }: { data: FailedPayment[] }) {
  if (data.length === 0)
    return <p className="px-4 py-6 text-center text-[13px] text-[#9CA3AF]">Sin pagos fallidos</p>;

  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-[#E5E7EB]">
          {["Cliente", "Descripción", "Importe", "Código de error", "Fecha"].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F3F4F6]">
        {data.map((p) => (
          <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
            <td className="px-4 py-3">
              <p className="text-[12px] text-[#0A0A0A] truncate max-w-[160px]">
                {p.customerName ?? p.customerEmail ?? "—"}
              </p>
              {p.customerEmail && p.customerName && (
                <p className="text-[10px] text-[#9CA3AF] truncate max-w-[160px]">{p.customerEmail}</p>
              )}
            </td>
            <td className="px-4 py-3 text-[#6B7280] max-w-[200px] truncate">
              {p.description ?? "—"}
            </td>
            <td className="px-4 py-3 tabular-nums font-normal text-[#0A0A0A]">
              {fmtAmt(p.amount, p.currency)}
            </td>
            <td className="px-4 py-3">
              <FailureBadge code={p.failureCode} />
              {p.failureMessage && (
                <p className="text-[10px] text-[#9CA3AF] mt-0.5 max-w-[180px] truncate">{p.failureMessage}</p>
              )}
            </td>
            <td className="px-4 py-3 tabular-nums text-[#9CA3AF] whitespace-nowrap">
              {formatDate(p.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Tabla Suscripciones Fallidas ─────────────────────────────────────────────
function SubscriptionsTable({ data }: { data: FailedSubscription[] }) {
  if (data.length === 0)
    return <p className="px-4 py-6 text-center text-[13px] text-[#9CA3AF]">Sin cobros fallidos de suscripción</p>;

  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-[#E5E7EB]">
          {["Cliente", "Ref. externa", "Importe", "Motivo", "Fecha"].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F3F4F6]">
        {data.map((s) => (
          <tr key={s.id} className="hover:bg-[#FAFAFA] transition-colors">
            <td className="px-4 py-3">
              <p className="text-[12px] text-[#0A0A0A] truncate max-w-[160px]">{s.customerName}</p>
              {s.customer?.email && (
                <p className="text-[10px] text-[#9CA3AF] truncate max-w-[160px]">{s.customer.email}</p>
              )}
            </td>
            <td className="px-4 py-3 text-[#6B7280] font-mono text-[11px]">
              {s.externalRef ?? "—"}
            </td>
            <td className="px-4 py-3 tabular-nums font-normal text-[#0A0A0A]">
              {fmtAmt(s.amount, s.currency)}
            </td>
            <td className="px-4 py-3">
              <FailureBadge code={s.failureReason} />
            </td>
            <td className="px-4 py-3 tabular-nums text-[#9CA3AF] whitespace-nowrap">
              {formatDate(s.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImpagosPage() {
  const [tab, setTab] = useState<"payments" | "subscriptions">("payments");
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, mutate } = useSWR<ImpagosData>(
    "/api/dashboard/impagos",
    fetcher,
    { revalidateOnFocus: false },
  );

  const summary = data?.summary;
  const failedPayments      = data?.failedPayments.data      ?? [];
  const failedSubscriptions = data?.failedSubscriptions.data ?? [];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-normal tracking-tight text-[#0A0A0A]">Impagos</h1>
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">
              Pagos fallidos y cobros de suscripción no procesados
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-3.5 py-2 text-[12px] text-[#6B7280] hover:bg-[#F9FAFB] transition"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Actualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="Total impagado"
            value={summary ? fmtAmt(summary.totalFailedAmount) : "—"}
            sub={`${summary?.totalFailedCount ?? 0} registros`}
            highlight
          />
          <KpiCard
            label="Pagos directos"
            value={String(summary?.failedPayments ?? 0)}
            sub="Pagos con status FAILED"
          />
          <KpiCard
            label="Cobros suscripción"
            value={String(summary?.failedSubscriptions ?? 0)}
            sub="Fallos en batch"
          />
          <KpiCard
            label="Tasa de fallo"
            value={summary ? `${summary.failureRate}%` : "—"}
            sub="Sobre el total de cobros"
          />
        </div>

        {/* Tablas colapsables */}
        <div className="rounded-[12px] border border-[#E5E7EB] bg-white overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center gap-0 border-b border-[#E5E7EB]">
            {(["payments", "subscriptions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-5 py-3.5 text-[12px] font-medium transition-colors border-b-2 -mb-px",
                  tab === t
                    ? "border-[#0A0A0A] text-[#0A0A0A]"
                    : "border-transparent text-[#9CA3AF] hover:text-[#6B7280]",
                )}
              >
                {t === "payments" ? (
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Pagos fallidos
                    {data && data.failedPayments.total > 0 && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                        {data.failedPayments.total}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Suscripciones fallidas
                    {data && data.failedSubscriptions.total > 0 && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                        {data.failedSubscriptions.total}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}

            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto px-4 text-[#9CA3AF] hover:text-[#6B7280] transition"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Tabla */}
          {expanded && (
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#9CA3AF]" />
                </div>
              ) : tab === "payments" ? (
                <PaymentsTable data={failedPayments} />
              ) : (
                <SubscriptionsTable data={failedSubscriptions} />
              )}
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#F3F4F6]">
              <TrendingDown className="h-4 w-4 text-[#6B7280]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0A0A0A] mb-1">¿Por qué fallan los pagos?</p>
              <ul className="space-y-1 text-[12px] text-[#6B7280]">
                <li><span className="font-mono text-[11px] bg-slate-100 px-1 rounded">card_declined</span> — La tarjeta fue rechazada por el banco emisor.</li>
                <li><span className="font-mono text-[11px] bg-slate-100 px-1 rounded">insufficient_funds</span> — Saldo insuficiente en la cuenta del cliente.</li>
                <li><span className="font-mono text-[11px] bg-slate-100 px-1 rounded">expired_card</span> — La tarjeta ha caducado.</li>
                <li><span className="font-mono text-[11px] bg-slate-100 px-1 rounded">authentication_required</span> — Se requiere autenticación 3D Secure adicional.</li>
              </ul>
              <div className="mt-3 flex gap-3">
                <Link href="/app/subscriptions" className="flex items-center gap-1 text-[12px] text-[#0A0A0A] underline underline-offset-2">
                  Gestionar suscripciones <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link href="/app/payments" className="flex items-center gap-1 text-[12px] text-[#0A0A0A] underline underline-offset-2">
                  Ver todos los pagos <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
