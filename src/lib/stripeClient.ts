import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn("[stripeClient] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada");
}

export const stripePromise = loadStripe(publishableKey ?? "");
