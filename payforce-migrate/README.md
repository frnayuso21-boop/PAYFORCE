# payforce-migrate

> Official CLI migration tool for PayForce — migrate from Stripe or Lemon Squeezy in minutes.

## Quick start

```bash
npx payforce-migrate
```

Or install globally:

```bash
npm install -g payforce-migrate
payforce-migrate
```

## What it migrates

| Resource    | Stripe | Lemon Squeezy |
|-------------|--------|---------------|
| Customers   | ✅     | ✅            |
| Products    | ✅     | ✅            |
| Payments    | ✅     | ✅            |
| Subscriptions | 🔜   | 🔜            |

## Requirements

- Node.js ≥ 18
- A PayForce API key (`pf_live_...`) — get one at [payforce.io/app/developers](https://payforce.io/app/developers)
- Your Stripe secret key (`sk_live_...` or `sk_test_...`) **or** Lemon Squeezy API key

## Usage

```
$ npx payforce-migrate

? Your PayForce API key (pf_live_...): ****
? Source platform: Stripe
? Stripe Secret Key (sk_live_...): ****
? Run as dry-run first? [Y/n]: Y

⠋ Connecting to Stripe…
✔ Migration preview complete!

─── Results ─────────────────────────────────
  Customers   ✓ 128 migrated  ⊘ 0 skipped  ✗ 0 errors
  Products    ✓ 14 migrated   ⊘ 0 skipped  ✗ 0 errors
  Payments    ✓ 853 migrated  ⊘ 0 skipped  ✗ 0 errors
─────────────────────────────────────────────

Dry-run complete. Run again without dry-run to import the data.
```

## API usage (advanced)

You can also trigger a migration via the REST API:

```bash
curl -X POST https://payforce.io/api/migrate \
  -H "Authorization: Bearer pf_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "source": "stripe",
    "stripe_secret": "sk_live_...",
    "dry_run": true
  }'
```

## License

MIT © PayForce Systems S.L.
