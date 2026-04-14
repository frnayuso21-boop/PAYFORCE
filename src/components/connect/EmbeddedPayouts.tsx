"use client";

import {
  ConnectBalances,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { ConnectProvider } from "./ConnectProvider";

interface EmbeddedPayoutsProps {
  accountId?: string;
}

/**
 * EmbeddedPayouts
 *
 * Balance disponible + historial de payouts.
 * El merchant gestiona sus retiradas directamente en PayForce.
 */
export function EmbeddedPayouts({ accountId }: EmbeddedPayoutsProps) {
  return (
    <ConnectProvider accountId={accountId}>
      <div className="space-y-6">
        <ConnectBalances />
        <ConnectPayouts />
      </div>
    </ConnectProvider>
  );
}
