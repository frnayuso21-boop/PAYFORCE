"use client";

import { ConnectAccountManagement } from "@stripe/react-connect-js";
import { ConnectProvider }          from "./ConnectProvider";

interface EmbeddedAccountProps {
  accountId?: string;
}

/**
 * EmbeddedAccount
 *
 * Gestión completa de la cuenta de cobros dentro de PayForce:
 * datos bancarios, documentos, notificaciones, configuración.
 *
 * Reemplaza el Express Dashboard como herramienta de gestión.
 */
export function EmbeddedAccount({ accountId }: EmbeddedAccountProps) {
  return (
    <ConnectProvider accountId={accountId}>
      <ConnectAccountManagement />
    </ConnectProvider>
  );
}
