"use client";

import { useState }                  from "react";
import { ConnectAccountOnboarding }  from "@stripe/react-connect-js";
import { ConnectProvider }           from "./ConnectProvider";
import { AlertCircle, RefreshCw }    from "lucide-react";

interface EmbeddedOnboardingProps {
  accountId?:  string;
  onComplete?: () => void;
}

/**
 * EmbeddedOnboarding
 *
 * Onboarding 100% embebido dentro de PayForce.
 * Reemplaza el redirect a Stripe Express Dashboard onboarding.
 */
export function EmbeddedOnboarding({
  accountId,
  onComplete,
}: EmbeddedOnboardingProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [key,       setKey]       = useState(0); // para forzar re-mount

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-800">Error al cargar la verificación</p>
          <p className="mt-1 text-[13px] text-slate-500 max-w-sm">{loadError}</p>
        </div>
        <button
          onClick={() => { setLoadError(null); setKey((k) => k + 1); }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <ConnectProvider
      key={key}
      accountId={accountId}
      onError={(err: Error) => setLoadError(err.message)}
    >
      <ConnectAccountOnboarding
        onExit={() => onComplete?.()}
      />
    </ConnectProvider>
  );
}
