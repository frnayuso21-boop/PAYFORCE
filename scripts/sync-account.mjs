/**
 * Fuerza sincronización del estado de la cuenta Stripe con la BD local.
 * Uso: node scripts/sync-account.mjs
 */

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// Leer .env.local manualmente
function loadEnv(path) {
  try {
    readFileSync(path, "utf8").split("\n").forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
    });
  } catch {}
}
loadEnv(".env.local");
loadEnv(".env");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
const db     = new PrismaClient();

function resolveStatus(acct) {
  if (!acct.details_submitted)                          return "PENDING";
  if (acct.charges_enabled && acct.payouts_enabled)    return "ENABLED";
  if (acct.requirements?.disabled_reason)               return "REJECTED";
  if ((acct.requirements?.currently_due?.length ?? 0) > 0) return "REQUIRES_ACTION";
  return "RESTRICTED";
}

async function main() {
  const accounts = await db.connectedAccount.findMany({
    where: { NOT: { stripeAccountId: { startsWith: "local_" } } },
  });

  if (!accounts.length) {
    console.log("❌  No hay cuentas reales conectadas.");
    return;
  }

  for (const acc of accounts) {
    console.log(`\n🔍  Consultando Stripe: ${acc.stripeAccountId}`);
    try {
      const sa     = await stripe.accounts.retrieve(acc.stripeAccountId);
      const status = resolveStatus(sa);

      console.log(`   charges_enabled:    ${sa.charges_enabled}`);
      console.log(`   payouts_enabled:    ${sa.payouts_enabled}`);
      console.log(`   details_submitted:  ${sa.details_submitted}`);
      console.log(`   status → ${status}`);

      if (sa.requirements?.currently_due?.length) {
        console.log(`   ⚠️  Pendiente:`, sa.requirements.currently_due);
      }
      if (sa.requirements?.eventually_due?.length) {
        console.log(`   ℹ️  Eventually due:`, sa.requirements.eventually_due);
      }

      await db.connectedAccount.update({
        where: { id: acc.id },
        data: {
          status,
          chargesEnabled:   sa.charges_enabled   ?? false,
          payoutsEnabled:   sa.payouts_enabled   ?? false,
          detailsSubmitted: sa.details_submitted ?? false,
        },
      });

      if (status === "ENABLED") {
        console.log(`\n✅  CUENTA ACTIVA — los próximos links de pago serán REALES.`);
      } else {
        console.log(`\n⚠️  Cuenta aún no lista para cobros reales. Completa el onboarding en /app/connect/onboarding`);
      }
    } catch (err) {
      console.error(`   ❌ Error Stripe:`, err.message);
    }
  }

  await db.$disconnect();
}

main();
