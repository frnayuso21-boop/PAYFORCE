"use client";

import { useState, useEffect, useRef } from "react";
import { ConnectAccountOnboarding }    from "@stripe/react-connect-js";
import { ConnectProvider }             from "./ConnectProvider";
import { AlertCircle, RefreshCw }      from "lucide-react";

interface EmbeddedOnboardingProps {
  accountId?:  string;
  onComplete?: () => void;
}

const TIMEOUT_MS = 10_000; // 10 segundos

/**
 * EmbeddedOnboarding
 *
 * Onboarding 100% embebido dentro de PayForce.
 * Reemplaza el redirect a Stripe Express Dashboard onboarding.
 * Incluye timeout de 10s y botón Reintentar si el componente no carga.
 */
export function EmbeddedOnboarding({
  accountId,
  onComplete,
}: EmbeddedOnboardingProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [key,       setKey]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arranca el timeout cada vez que se monta/re-monta el componente
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      console.error("[EmbeddedOnboarding] Timeout: el componente no cargó en 10 s");
      setLoadError(
        "El componente de verificación tardó demasiado en cargar. " +
        "Comprueba tu conexión y pulsa Reintentar."
      );
    }, TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key]); // se reinicia cada vez que se pulsa Reintentar

  function handleReady() {
    // El client_secret llegó correctamente — cancelamos el timeout
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    console.log("[EmbeddedOnboarding] Componente listo ✓");
  }

  function handleError(err: Error) {
    if (timerRef.current) clearTimeout(timerRef.current);
    console.error("[EmbeddedOnboarding] Error:", err.message);
    setLoadError(err.message);
  }

  function handleRetry() {
    setLoadError(null);
    setKey((k) => k + 1);
  }

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
          onClick={handleRetry}
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
      onError={handleError}
      onReady={handleReady}
    >
      <ConnectAccountOnboarding
        onExit={() => onComplete?.()}
      />
    </ConnectProvider>
  );
}
