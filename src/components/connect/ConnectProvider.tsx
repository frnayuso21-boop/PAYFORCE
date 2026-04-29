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
  onReady?:   () => void;  // llamado cuando client_secret se obtiene correctamente
}

export function ConnectProvider({ children, accountId, onError, onReady }: ConnectProviderProps) {
  const stripeConnect: StripeConnectInstance = useMemo(() => {
    const fetchClientSecret = async (): Promise<string> => {
      const res = await fetch("/api/connect/account-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    accountId ? JSON.stringify({ accountId }) : undefined,
      });

      const data = await res.json().catch(() => ({})) as { client_secret?: string; error?: string };

      if (data.error) {
        const err = new Error(data.error);
        onError?.(err);
        throw err;
      }

      if (!res.ok || !data.client_secret) {
        const err = new Error(`Error ${res.status} — sin client_secret en la respuesta`);
        onError?.(err);
        throw err;
      }

      onReady?.();
      return data.client_secret;
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
