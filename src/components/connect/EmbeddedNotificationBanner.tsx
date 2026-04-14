"use client";

import type { NotificationCount }   from "@stripe/connect-js";
import { ConnectNotificationBanner } from "@stripe/react-connect-js";
import { ConnectProvider }           from "./ConnectProvider";

interface EmbeddedNotificationBannerProps {
  accountId?:             string;
  onNotificationsChange?: (count: NotificationCount) => void;
}

/**
 * EmbeddedNotificationBanner
 *
 * Muestra avisos de acciones pendientes directamente en PayForce.
 * Sustituye cualquier "ir a Stripe a completar requisitos".
 *
 * Solo se renderiza si hay notificaciones reales — si no hay nada, no ocupa espacio.
 */
export function EmbeddedNotificationBanner({
  accountId,
  onNotificationsChange,
}: EmbeddedNotificationBannerProps) {
  return (
    <ConnectProvider accountId={accountId}>
      <ConnectNotificationBanner
        onNotificationsChange={onNotificationsChange}
      />
    </ConnectProvider>
  );
}
