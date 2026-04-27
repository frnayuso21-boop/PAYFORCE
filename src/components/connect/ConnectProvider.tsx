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
      console.log("[ConnectProvider] Solicitando AccountSession…", { accountId });

      const res = await fetch("/api/connect/account-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    accountId ? JSON.stringify({ accountId }) : undefined,
      });

      const data = await res.json().catch(() => ({})) as { client_secret?: string; error?: string };
      console.log("Account session response:", data);

      if (data.error) {
        console.error("Error creating account session:", data.error);
        const err = new Error(data.error);
        onError?.(err);
        throw err;
      }

      if (!res.ok || !data.client_secret) {
        const msg = `Error ${res.status} — sin client_secret en la respuesta`;
        console.error("[ConnectProvider]", msg);
        const err = new Error(msg);
        onError?.(err);
        throw err;
      }

      console.log("[ConnectProvider] client_secret obtenido ✓");
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
