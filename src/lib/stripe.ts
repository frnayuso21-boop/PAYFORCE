import Stripe from "stripe";
import { env } from "@/lib/env";

export const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
export const webhookSecret          = STRIPE_WEBHOOK_SECRET;

// Singleton: reutiliza la instancia entre hot-reloads en desarrollo.
const globalForStripe = globalThis as unknown as { stripe: Stripe };

export const stripe: Stripe =
  globalForStripe.stripe ??
  new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion:        "2026-02-25.clover",
    typescript:        true,
    maxNetworkRetries: 2,
    timeout:           10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}
