"use client";

import { ConnectComponentsProvider } from "@stripe/react-connect-js";
import { loadConnectAndInitialize }   from "@stripe/connect-js";
import type { StripeConnectInstance } from "@stripe/connect-js";
import { useMemo }                    from "react";

/**
 * ConnectProvider
 *
 * Inicializa @stripe/connect-js con theming PayForce y fetchClientSecret
 * que llama a POST /api/connect/account-session on-demand.
 *
 * Uso:
 *   <ConnectProvider>
 *     <ConnectAccountOnboarding ... />
 *   </ConnectProvider>
 *
 * El Account Session se regenera automáticamente cuando caduca (~1h).
 * NO se almacena en BD — siempre on-demand.
 */

const PAYFORCE_APPEARANCE = {
  variables: {
    colorPrimary:       "#2D1F3D",
    colorBackground:    "#ffffff",
    colorText:          "#111111",
    colorDanger:        "#dc2626",
    fontFamily:         "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius:       "12px",
    spacingUnit:        "4px",
    buttonBorderRadius: "10px",
  },
} as const;

interface ConnectProviderProps {
  children:   React.ReactNode;
  accountId?: string;
  onError?:   (err: Error) => void;
}

export function ConnectProvider({ children, accountId, onError }: ConnectProviderProps) {
  const stripeConnect: StripeConnectInstance = useMemo(() => {
    const fetchClientSecret = async (): Promise<string> => {
      const body = accountId ? JSON.stringify({ accountId }) : undefined;
      const res  = await fetch("/api/connect/account-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      let json: { client_secret?: string; error?: string } = {};
      try { json = await res.json(); } catch { /* res no tiene JSON */ }

      if (!res.ok || !json.client_secret) {
        const msg = json.error ?? `Error ${res.status} al obtener sesión de Stripe`;
        console.error("[ConnectProvider] fetchClientSecret error:", msg);
        const err = new Error(msg);
        onError?.(err);
        throw err;
      }
      return json.client_secret;
    };

    return loadConnectAndInitialize({
      publishableKey:    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret,
      appearance:        PAYFORCE_APPEARANCE,
      locale:            "es-ES",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  return (
    <ConnectComponentsProvider connectInstance={stripeConnect}>
      {children}
    </ConnectComponentsProvider>
  );
}
