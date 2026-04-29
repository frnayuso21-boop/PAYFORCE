/**
 * src/hooks/useData.ts
 *
 * Hooks SWR centralizados para todo el dashboard.
 * La configuración global viene del SWRProvider del layout:
 * - revalidateOnFocus: false
 * - dedupingInterval: 60s
 * - keepPreviousData: true   ← nunca pantalla en blanco al navegar
 */
import useSWR from "swr";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const useDashboardAll     = () => useSWR("/api/dashboard/all");
export const useOverview         = (params?: string) =>
  useSWR(params ? `/api/dashboard/overview?${params}` : "/api/dashboard/overview");

// ─── Pagos ────────────────────────────────────────────────────────────────────
export const usePayments         = (filter = "all", limit = 100) =>
  useSWR(`/api/dashboard/payments?limit=${limit}&status=${filter}`);

// ─── Balance / Payouts ────────────────────────────────────────────────────────
export const useBalance              = () => useSWR("/api/dashboard/balance");
export const useInstantPayout        = () => useSWR("/api/payouts/instant");
export const useInstantPayoutStatus  = () => useSWR("/api/dashboard/payouts/instant-status");

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const useCustomers            = (limit = 100) =>
  useSWR(`/api/customers?limit=${limit}`);

// ─── Splits ───────────────────────────────────────────────────────────────────
export const useSplits               = () => useSWR("/api/dashboard/splits");

// ─── Managers ─────────────────────────────────────────────────────────────────
export const useManagers             = () => useSWR("/api/dashboard/managers");

// ─── Productos ────────────────────────────────────────────────────────────────
export const useProducts             = () => useSWR("/api/products?active=false");

// ─── Payment Links ────────────────────────────────────────────────────────────
export const usePaymentLinks         = () => useSWR("/api/payment-links");

// ─── Suscripciones ────────────────────────────────────────────────────────────
export const useSubscriptionCustomers = () => useSWR("/api/subscriptions/customers");

// ─── Facturas ─────────────────────────────────────────────────────────────────
export const useInvoicesPayments     = () =>
  useSWR("/api/dashboard/payments?limit=100");
export const useInvoiceSettings      = () => useSWR("/api/invoices/settings");
export const useManualInvoices       = () => useSWR("/api/invoices/manual");

// ─── Settings ─────────────────────────────────────────────────────────────────
export const useStatementDescriptor  = () =>
  useSWR("/api/dashboard/settings/statement-descriptor");
