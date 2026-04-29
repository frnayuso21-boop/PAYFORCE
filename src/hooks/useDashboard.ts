/**
 * src/hooks/useDashboard.ts
 *
 * Hooks SWR para todas las páginas del dashboard.
 * dedupingInterval: 30s → si el usuario navega a otra página y vuelve
 * en menos de 30s, los datos se muestran INSTANTÁNEAMENTE desde la caché.
 */
import useSWR, { type SWRResponse } from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? r.json() : null));

const SWR_CONFIG = {
  revalidateOnFocus:     false,
  revalidateOnReconnect: false,
  dedupingInterval:      30_000,
  keepPreviousData:      true,
} as const;

// ─── Dashboard principal ──────────────────────────────────────────────────────
export function useDashboardInit(): SWRResponse {
  return useSWR("/api/dashboard/init", fetcher, SWR_CONFIG);
}

export function useDashboardAll(): SWRResponse {
  return useSWR("/api/dashboard/all", fetcher, SWR_CONFIG);
}

// ─── Overview (acepta params de fecha) ────────────────────────────────────────
export function useOverview(params?: string): SWRResponse {
  const key = params
    ? `/api/dashboard/overview?${params}`
    : "/api/dashboard/overview";
  return useSWR(key, fetcher, SWR_CONFIG);
}

// ─── Payments (acepta filter de status) ───────────────────────────────────────
export function usePayments(filter = "all", limit = 100): SWRResponse {
  const key = `/api/dashboard/payments?limit=${limit}&status=${filter}`;
  return useSWR(key, fetcher, SWR_CONFIG);
}

// ─── Balance ──────────────────────────────────────────────────────────────────
export function useBalance(): SWRResponse {
  return useSWR("/api/dashboard/balance", fetcher, SWR_CONFIG);
}

export function useInstantPayout(): SWRResponse {
  return useSWR("/api/payouts/instant", fetcher, SWR_CONFIG);
}

export function useInstantPayoutStatus(): SWRResponse {
  return useSWR("/api/dashboard/payouts/instant-status", fetcher, SWR_CONFIG);
}

// ─── Customers ────────────────────────────────────────────────────────────────
export function useCustomers(limit = 100): SWRResponse {
  return useSWR(`/api/customers?limit=${limit}`, fetcher, SWR_CONFIG);
}

// ─── Splits ───────────────────────────────────────────────────────────────────
export function useSplits(): SWRResponse {
  return useSWR("/api/dashboard/splits", fetcher, SWR_CONFIG);
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function useStatementDescriptor(): SWRResponse {
  return useSWR(
    "/api/dashboard/settings/statement-descriptor",
    fetcher,
    SWR_CONFIG,
  );
}
