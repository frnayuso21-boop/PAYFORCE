import type { Metadata }  from "next";
import { redirect }       from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { Badge }          from "@/components/ui/badge";
import { EmptyState }     from "@/components/dashboard/EmptyState";
import { MobileHeader }   from "@/components/mobile/MobileHeader";
import { MobileCard }     from "@/components/mobile/MobileCard";
import { InstantPayoutButton } from "@/components/mobile/InstantPayout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db }             from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

// ── Estado de cada liquidación ────────────────────────────────────────────────
type SplitStatus = "pending" | "paid" | "failed";

const statusConfig: Record<
  SplitStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  paid:    { label: "Pagado",    variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  failed:  { label: "Fallido",   variant: "destructive" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function PayoutsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await db.user.findUnique({
    where:  { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  // Cuentas del usuario
  const accounts = await db.connectedAccount.findMany({
    where:  { userId: dbUser.id },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  // MerchantSplits = registro del reparto de cada pago (Destination Charges)
  const splits = accountIds.length > 0
    ? await db.merchantSplit.findMany({
        where:   { connectedAccountId: { in: accountIds } },
        include: {
          payment: {
            select: {
              currency:              true,
              description:           true,
              stripePaymentIntentId: true,
              createdAt:             true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take:    100,
      })
    : [];

  // ── Métricas ────────────────────────────────────────────────────────────────
  // Importes en BD están en céntimos — dividir por 100 para formatCurrency
  const totalPaidCents    = splits.filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.amountToPayMerchant, 0);
  const totalPendingCents = splits.filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.amountToPayMerchant, 0);

  // Moneda dominante para los totales
  const currency = splits[0]?.payment?.currency ?? "eur";

  const statusBadgeColor: Record<string, string> = {
    paid:    "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed:  "bg-red-100 text-red-600",
  };

  return (
    <>
    {/* ── MOBILE ──────────────────────────────────────────────────────────────── */}
    <div className="flex min-h-screen w-full flex-col bg-slate-50 md:hidden">
      <MobileHeader title="Pagos" />

      <div className="w-full space-y-2.5 px-4 pb-4 pt-3">

        {/* Instant Payout */}
        <InstantPayoutButton />

        {/* Stats strip */}
        <MobileCard padding={false} className="overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: "Pagado",       value: formatCurrency(totalPaidCents / 100, currency) },
              { label: "Pendiente",    value: formatCurrency(totalPendingCents / 100, currency) },
              { label: "Liquidac.",    value: splits.length.toString() },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center px-2 py-4">
                <p className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 leading-none">
                  {item.label}
                </p>
                <p className="mt-2 text-[18px] font-bold tabular-nums text-slate-900 text-center leading-none">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {["Estado", "Fecha de creación"].map((f) => (
            <button
              key={f}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-slate-600"
            >
              {f}
            </button>
          ))}
        </div>

        {/* Lista */}
        <MobileCard padding={false} className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <p className="text-[14px] font-semibold text-slate-900">Historial</p>
          </div>

          {splits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <p className="text-3xl">💸</p>
              <p className="text-[14px] font-semibold text-slate-700">Sin liquidaciones</p>
              <p className="text-[12px] text-slate-400">
                Aparecerán aquí cuando se procesen tus cobros
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {splits.map((split) => {
                const desc  = split.payment?.description ?? `Pago ${split.paymentId.slice(0, 8)}…`;
                const date  = split.paidAt ?? split.createdAt;
                const sc    = statusConfig[split.status as SplitStatus];
                const color = statusBadgeColor[split.status] ?? "bg-slate-100 text-slate-500";
                return (
                  <div key={split.id} className="flex w-full items-center gap-3 px-4 py-3.5">
                    <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}>
                      {sc?.label ?? split.status}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-slate-900 leading-tight">
                        {desc}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatDate(date.toISOString())}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-bold tabular-nums text-slate-900 leading-tight">
                        {formatCurrency(split.amountToPayMerchant / 100, split.payment?.currency ?? "eur")}
                      </p>
                      {split.platformFee > 0 && (
                        <p className="text-[11px] text-slate-400">
                          fee {formatCurrency(split.platformFee / 100, split.payment?.currency ?? "eur")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </MobileCard>
      </div>
    </div>

    {/* ── DESKTOP ──────────────────────────────────────────────────────────────── */}
    <div className="hidden md:block max-w-5xl mx-auto space-y-8 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Liquidaciones a tu cuenta desde PayForce
          </p>
        </div>
        {/* El botón se mantiene decorativo hasta implementar payout manual */}
        <button
          disabled
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-400 cursor-not-allowed"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Solicitar payout
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
        <StatCell label="Total pagado"     value={formatCurrency(totalPaidCents / 100, currency)} />
        <StatCell label="Pendiente"        value={formatCurrency(totalPendingCents / 100, currency)} muted />
        <StatCell label="Total liquidaciones" value={splits.length.toString()} />
      </div>

      {/* Table */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Historial</h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {splits.length === 0 ? (
            <EmptyState
              icon="💸"
              title="Sin liquidaciones todavía"
              description="Las liquidaciones aparecerán aquí cuando se procesen pagos a través de PayForce."
            />
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Descripción", "Referencia", "Estado", "Fecha", "Importe"].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide ${
                            i === 4 ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {splits.map((split) => {
                    const s = statusConfig[split.status as SplitStatus] ?? {
                      label:   split.status,
                      variant: "secondary" as const,
                    };
                    const description =
                      split.payment?.description ??
                      `Pago ${split.payment?.stripePaymentIntentId?.slice(0, 12) ?? split.paymentId.slice(0, 8)}…`;
                    const dateLabel = split.status === "paid" && split.paidAt
                      ? formatDate(split.paidAt.toISOString())
                      : formatDate(split.createdAt.toISOString());

                    return (
                      <tr
                        key={split.id}
                        className="hover:bg-slate-50/60 transition-colors duration-100"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                            {description}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(split.createdAt.toISOString())}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-500">
                            {split.payment?.stripePaymentIntentId?.slice(0, 14) ?? "—"}…
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-slate-600">{dateLabel}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(split.amountToPayMerchant / 100, split.payment?.currency ?? "eur")}
                          </span>
                          {split.platformFee > 0 && (
                            <p className="text-[10px] text-slate-400">
                              fee: {formatCurrency(split.platformFee / 100, split.payment?.currency ?? "eur")}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <span className="text-xs text-slate-400">
                  {splits.length} liquidaci{splits.length === 1 ? "ón" : "ones"}
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="font-medium text-slate-700">Total pagado</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(totalPaidCents / 100, currency)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// ── Celda de stat ─────────────────────────────────────────────────────────────
function StatCell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="bg-white px-6 py-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${muted ? "text-slate-400" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
