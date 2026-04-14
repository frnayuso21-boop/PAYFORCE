"use client";

import {
  ConnectPayments,
  ConnectPaymentDetails,
} from "@stripe/react-connect-js";
import { useState }        from "react";
import { ConnectProvider } from "./ConnectProvider";

interface EmbeddedPaymentsProps {
  accountId?: string;
}

/**
 * EmbeddedPayments
 *
 * Lista de pagos del merchant con detalle, reembolsos y disputas
 * gestionados 100% dentro de PayForce.
 *
 * ConnectPayments no expone onPaymentClicked nativo — se monta
 * ConnectPaymentDetails en paralelo cuando el usuario hace clic en
 * un pago desde la lista (el componente maneja el estado internamente).
 */
export function EmbeddedPayments({ accountId }: EmbeddedPaymentsProps) {
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  return (
    <ConnectProvider accountId={accountId}>
      <ConnectPayments />
      {selectedPayment && (
        <ConnectPaymentDetails
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </ConnectProvider>
  );
}
