#!/usr/bin/env node
/**
 * payforce-migrate CLI
 * Usage:  npx payforce-migrate
 *
 * Migrates customers, products and payment history from:
 *   - Stripe
 *   - Lemon Squeezy
 *  → to your PayForce account.
 */

import chalk   from "chalk";
import ora     from "ora";
import readline from "readline";

/* ── helpers ──────────────────────────────────────────────────────────────── */
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> =>
  new Promise(r => rl.question(q, a => r(a.trim())));
const askHidden = (q: string): Promise<string> =>
  new Promise(r => {
    process.stdout.write(q);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    let s = "";
    process.stdin.on("data", function handler(d) {
      const c = d.toString();
      if (c === "\r" || c === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", handler);
        process.stdout.write("\n");
        r(s);
      } else if (c === "\u0003") {
        process.exit();
      } else {
        s += c;
        process.stdout.write("*");
      }
    });
  });

const PAYFORCE_API = "https://payforce.io/api";

async function apiFetch(path: string, pf_key: string, body: object) {
  const res = await fetch(`${PAYFORCE_API}${path}`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${pf_key}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

/* ── banner ───────────────────────────────────────────────────────────────── */
console.log(chalk.bold("\n" + [
  "  ██████╗  █████╗ ██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗███████╗",
  "  ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝",
  "  ██████╔╝███████║ ╚████╔╝ █████╗  ██║   ██║██████╔╝██║     █████╗  ",
  "  ██╔═══╝ ██╔══██║  ╚██╔╝  ██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝  ",
  "  ██║     ██║  ██║   ██║   ██║     ╚██████╔╝██║  ██║╚██████╗███████╗",
  "  ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝",
].join("\n"), chalk.magenta));

console.log(chalk.gray("  Migration tool v1.0.0 · payforce.io/developers\n"));

/* ── main ─────────────────────────────────────────────────────────────────── */
async function main() {
  console.log(chalk.bold.white("Welcome to payforce-migrate 🚀\n"));
  console.log("This tool will migrate your customers, products and payment history to PayForce.\n");

  // 1. PayForce API key
  const pf_key = await askHidden(chalk.cyan("? ") + chalk.bold("Your PayForce API key") + chalk.gray(" (pf_live_...): "));
  if (!pf_key.startsWith("pf_")) {
    console.log(chalk.red("\n✗ Invalid API key. Must start with pf_live_"));
    process.exit(1);
  }

  // 2. Source platform
  console.log("\n" + chalk.bold("Source platform:"));
  console.log("  " + chalk.cyan("[1]") + " Stripe");
  console.log("  " + chalk.cyan("[2]") + " Lemon Squeezy\n");
  const sourceChoice = await ask(chalk.cyan("? ") + "Choose [1/2]: ");
  const source = sourceChoice === "2" ? "lemon_squeezy" : "stripe";
  const sourceLabel = source === "stripe" ? "Stripe" : "Lemon Squeezy";

  // 3. Source credentials
  let stripe_secret: string | undefined;
  let ls_api_key:    string | undefined;

  if (source === "stripe") {
    stripe_secret = await askHidden(chalk.cyan("? ") + chalk.bold("Stripe Secret Key") + chalk.gray(" (sk_live_... or sk_test_...): "));
    if (!stripe_secret.startsWith("sk_")) {
      console.log(chalk.red("\n✗ Invalid Stripe key."));
      process.exit(1);
    }
  } else {
    ls_api_key = await askHidden(chalk.cyan("? ") + chalk.bold("Lemon Squeezy API Key: "));
  }

  // 4. Dry run?
  const dryRunInput = await ask(chalk.cyan("? ") + "Run as dry-run first? (preview without writing data) " + chalk.gray("[Y/n]: "));
  const dry_run = dryRunInput.toLowerCase() !== "n";

  if (dry_run) {
    console.log(chalk.yellow("\n⚠  Dry-run mode: no data will be written.\n"));
  } else {
    console.log(chalk.yellow("\n⚠  This will import real data into your PayForce account.\n"));
    const confirm = await ask(chalk.cyan("? ") + "Are you sure? " + chalk.gray("[yes/no]: "));
    if (confirm.toLowerCase() !== "yes") {
      console.log(chalk.gray("Cancelled."));
      process.exit(0);
    }
  }

  rl.close();

  // 5. Run migration
  const spinner = ora({
    text:    `Connecting to ${sourceLabel}…`,
    color:   "magenta",
    spinner: "dots",
  }).start();

  try {
    const result = await apiFetch("/migrate", pf_key, {
      source,
      stripe_secret,
      ls_api_key,
      dry_run,
    });

    spinner.succeed("Migration " + (dry_run ? "preview" : "") + " complete!");
    console.log("");

    if (result.error) {
      console.log(chalk.red("✗ Error: " + result.error.message));
      process.exit(1);
    }

    const { customers, products, payments } = result;

    console.log(chalk.bold("─── Results ─────────────────────────────────────"));
    const row = (label: string, r: { migrated: number; skipped: number; errors: number }) => {
      const migCol = r.migrated > 0 ? chalk.green(r.migrated) : chalk.gray(r.migrated);
      const errCol = r.errors   > 0 ? chalk.red(r.errors)     : chalk.gray(r.errors);
      console.log(`  ${chalk.bold(label.padEnd(12))}  ✓ ${migCol} migrated  ⊘ ${chalk.gray(r.skipped)} skipped  ✗ ${errCol} errors`);
    };

    row("Customers", customers);
    row("Products",  products);
    row("Payments",  payments);

    console.log(chalk.bold("─────────────────────────────────────────────────\n"));

    if (dry_run) {
      console.log(chalk.yellow("Dry-run complete. Run again without dry-run to import the data.\n"));
    } else {
      console.log(chalk.green.bold("✓ Migration successful! Your data is now in PayForce.\n"));
      console.log(chalk.gray("  → Dashboard: https://payforce.io/app/dashboard"));
      console.log(chalk.gray("  → Docs:      https://payforce.io/developers\n"));
    }
  } catch (e) {
    spinner.fail("Migration failed.");
    console.error(chalk.red(String(e)));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
