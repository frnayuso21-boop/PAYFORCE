"use client";

import { ConnectDisputesList } from "@stripe/react-connect-js";
import { ConnectProvider } from "./ConnectProvider";

interface EmbeddedDisputesProps {
 accountId?: string;
}

/**
 * EmbeddedDisputes
 *
 * Gestión de disputas del merchant dentro de PayForce.
 */
export function EmbeddedDisputes({ accountId }: EmbeddedDisputesProps) {
 return (
 <ConnectProvider accountId={accountId}>
 <ConnectDisputesList />
 </ConnectProvider>
 );
}
