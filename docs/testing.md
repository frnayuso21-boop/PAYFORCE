# PayForce — Guía de Testing End-to-End con Stripe CLI

> Cubre los 6 flujos críticos: PaymentElement · Destination Charges · Connect Onboarding · Webhooks · Disputes · Refunds

---

## Prerequisitos globales

```bash
# 1. Instalar Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# 2. Autenticarse una sola vez
stripe login
# → Abre el navegador, autoriza la cuenta de test

# 3. Verificar versión (mínimo 1.21)
stripe --version

# 4. Copiar claves de test al proyecto
# Stripe Dashboard → Developers → API keys
# .env.local:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=             # ← se obtiene en el paso de webhooks

# 5. Arrancar Next.js
npm run dev
# → http://localhost:3000
```

> **Regla de oro**: las claves `pk_test_` / `sk_test_` **solo** funcionan en modo test.
> Los cobros no mueven dinero real. Puedes usar las tarjetas de abajo sin límite.

---

## Terminal setup recomendado

Abre **3 terminales** en paralelo durante los tests:

```
Terminal A │ npm run dev                                      ← servidor Next.js
Terminal B │ stripe listen --forward-to localhost:3000/...   ← proxy de webhooks
Terminal C │ stripe trigger ... / curl ...                   ← disparar eventos
```

---

## 1. PaymentElement

El Payment Element es el formulario de pago embebido de Stripe. Testear implica
verificar el ciclo: montar → introducir tarjeta → confirmar → redirigir a /success.

### 1.1 Setup

```bash
# Terminal B — activar el proxy ANTES de cargar el checkout
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copia el whsec_... que aparece y ponlo en STRIPE_WEBHOOK_SECRET
```

### 1.2 Flujo manual

1. Ir a `http://localhost:3000/checkout?plan=plan_pro`
2. El `CheckoutProvider` llama a `POST /api/payments/create-intent`
3. Esperar a que aparezca el Payment Element (si tarda → revisar que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está definida)
4. Usar cualquier tarjeta de la tabla siguiente

### 1.3 Tarjetas de prueba

| Tarjeta | CVV | Exp | Comportamiento |
|---|---|---|---|
| `4242 4242 4242 4242` | `123` | `12/34` | Pago aprobado → redirige a `/success` |
| `4000 0000 0000 9995` | `123` | `12/34` | Fondos insuficientes → error inline |
| `4000 0000 0000 0002` | `123` | `12/34` | Tarjeta denegada genérica |
| `4000 0025 0000 3155` | `123` | `12/34` | Requiere autenticación 3DS |
| `4000 0000 0000 3220` | `123` | `12/34` | 3DS — el banco lo rechaza |
| `4000 0000 0000 1091` | `123` | `12/34` | Tarjeta robada (card declined: stolen) |
| `4100 0000 0000 0019` | `123` | `12/34` | Siempre bloqueada por riesgo Stripe |

**Tarjetas SEPA Direct Debit (EUR):**
| IBAN | Comportamiento |
|---|---|
| `DE89370400440532013000` | Éxito |
| `DE62370400440532013001` | Fallo en el cobro |

### 1.4 Verificar el resultado

```bash
# Ver el PaymentIntent creado
stripe payment_intents list --limit 1

# Detalles del último
stripe payment_intents retrieve pi_xxx
```

Logs esperados en Terminal A (Next.js):
```
POST /api/payments/create-intent 200
```

Logs de Terminal B (webhook):
```
2024-01-15 10:00:00 --> payment_intent.created       [evt_xxx]
2024-01-15 10:00:05 --> payment_intent.succeeded     [evt_xxx]
```

### 1.5 Test del estado de error (API no disponible)

```bash
# Simular que la API key es inválida para ver el error state del CheckoutProvider
# Añade temporalmente en .env.local:
STRIPE_SECRET_KEY=sk_test_INVALIDA
# → El componente debe mostrar la card roja con "Reintentar"
```

---

## 2. Destination Charges

Con Destination Charges el dinero fluye: Cliente → Plataforma → Merchant (Connected Account).
La plataforma retiene `applicationFeeAmount` y transfiere el resto automáticamente.

### 2.1 Crear una Connected Account de test

```bash
# Crear cuenta Express en modo test
stripe accounts create \
  --type express \
  --country ES \
  --email "merchant-test@payforce.dev" \
  --capabilities[card_payments][requested]=true \
  --capabilities[transfers][requested]=true

# Respuesta: { "id": "acct_xxx", ... }
# Guarda este acct_xxx para los siguientes pasos
```

### 2.2 Crear un PaymentIntent con Destination Charge

```bash
stripe payment_intents create \
  --amount 10000 \
  --currency eur \
  --transfer-data[destination]=acct_xxx \
  --application-fee-amount 500 \
  --automatic-payment-methods[enabled]=true

# amount = 100 EUR
# applicationFee = 5 EUR (5%) → va a la plataforma
# transfer = 95 EUR → va a acct_xxx (merchant)
```

O vía el endpoint de la app:

```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "eur",
    "connectedAccountId": "acct_xxx",
    "applicationFeeAmount": 500,
    "metadata": { "plan": "pro", "test": "true" }
  }'

# Respuesta esperada:
# { "clientSecret": "pi_xxx_secret_xxx", "paymentIntentId": "pi_xxx" }
```

### 2.3 Confirmar el pago (simular tarjeta)

```bash
# Confirmar con tarjeta de test usando la Payment Method de test
stripe payment_intents confirm pi_xxx \
  --payment-method pm_card_visa
```

### 2.4 Verificar el flujo del dinero

```bash
# Ver el balance de la plataforma (debe aumentar en 5 EUR / 500 céntimos)
stripe balance retrieve

# Ver el balance del merchant (debe tener 95 EUR / 9500 céntimos)
stripe balance retrieve --stripe-account acct_xxx

# Ver la transferencia automática creada por el Destination Charge
stripe transfers list --destination acct_xxx --limit 1

# Ver la comisión de plataforma (application fee)
stripe application_fees list --limit 1
```

Salida esperada de `stripe balance retrieve`:
```json
{
  "available": [{ "amount": 500, "currency": "eur" }],
  "pending": [{ "amount": 0, "currency": "eur" }]
}
```

### 2.5 Forzar fallos específicos de Destination Charge

```bash
# Error: Connected Account no existe
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{ "amount": 5000, "currency": "eur", "connectedAccountId": "acct_NOEXISTE", "applicationFeeAmount": 250 }'
# Respuesta esperada: 422 - StripeInvalidRequestError

# Error: fee >= amount
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{ "amount": 5000, "currency": "eur", "connectedAccountId": "acct_xxx", "applicationFeeAmount": 5000 }'
# Respuesta esperada: 400 - "applicationFeeAmount must be less than amount"
```

---

## 3. Connect Onboarding

El onboarding lleva al merchant a completar su perfil en Stripe para activar `chargesEnabled` y `payoutsEnabled`.

### 3.1 Crear AccountLink (onboarding URL)

```bash
# Vía endpoint de la app
curl -X POST http://localhost:3000/api/connect/account-link \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acct_xxx",
    "returnUrl": "http://localhost:3000/app/connect",
    "refreshUrl": "http://localhost:3000/app/connect/onboarding"
  }'

# Respuesta: { "url": "https://connect.stripe.com/setup/...", "expiresAt": 1234567890 }
```

Abre la URL en el navegador. Stripe muestra el formulario de onboarding.

### 3.2 Completar onboarding en modo test

En el formulario de Stripe:

```
Nombre de empresa : Test Merchant SL
Tax ID (NIF)      : Cualquier formato válido (ej: A12345678)
Dirección         : Calle Mayor 1, 28001 Madrid
Teléfono          : +34 600 000 000
Cuenta bancaria   : ES9121000418450200051332  (IBAN de test de Stripe)
```

> Stripe en modo test acepta **cualquier IBAN** con formato válido — no hace
> verificación bancaria real.

### 3.3 Verificar que las capabilities se activaron

```bash
# Comprobar estado de la cuenta tras completar onboarding
stripe accounts retrieve acct_xxx | jq '{
  charges_enabled: .charges_enabled,
  payouts_enabled: .payouts_enabled,
  details_submitted: .details_submitted,
  requirements: .requirements.currently_due
}'
```

Salida esperada tras onboarding completo:
```json
{
  "charges_enabled": true,
  "payouts_enabled": true,
  "details_submitted": true,
  "requirements": []
}
```

### 3.4 Forzar estados intermedios

```bash
# Cuenta con requirements pendientes (restricted)
stripe accounts create \
  --type express \
  --country US \
  --capabilities[card_payments][requested]=true
# Las cuentas US requieren más info — quedan en RESTRICTED por defecto

# Ver qué requirements faltan
stripe accounts retrieve acct_xxx --expand requirements \
  | jq '.requirements.currently_due'
```

### 3.5 Webhook `account.updated`

Cada vez que el merchant completa un paso del onboarding, Stripe dispara `account.updated`.

```bash
# Simular manualmente el evento
stripe trigger account.updated

# Simular con capabilities activadas
stripe trigger account.updated \
  --override account:charges_enabled=true \
  --override account:payouts_enabled=true \
  --override account:details_submitted=true
```

Log esperado:
```json
{
  "level": "INFO",
  "event": "connect.account_updated",
  "stripeAccountId": "acct_xxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true
}
```

---

## 4. Webhooks

El handler `POST /api/stripe/webhook` debe verificar firma, ser idempotente,
y manejar todos los eventos relevantes.

### 4.1 Setup del listener local

```bash
# Terminal B
stripe listen \
  --forward-to localhost:3000/api/stripe/webhook \
  --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,account.updated,account.application.deauthorized,charge.refunded,payout.paid,payout.failed,charge.dispute.created,charge.dispute.updated,charge.dispute.closed

# Obtén el whsec_ y ponlo en .env.local como STRIPE_WEBHOOK_SECRET
# Reinicia el servidor Next.js
```

### 4.2 Disparar todos los eventos críticos

```bash
# ── Pagos ──────────────────────────────────────────────────────────────────
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger payment_intent.canceled

# ── Connect ────────────────────────────────────────────────────────────────
stripe trigger account.updated
stripe trigger account.application.deauthorized

# ── Payouts ────────────────────────────────────────────────────────────────
stripe trigger payout.paid
stripe trigger payout.failed

# ── Reembolsos ─────────────────────────────────────────────────────────────
stripe trigger charge.refunded

# ── Disputas ───────────────────────────────────────────────────────────────
stripe trigger charge.dispute.created
stripe trigger charge.dispute.updated
stripe trigger charge.dispute.closed
```

### 4.3 Test de idempotencia

```bash
# Disparar un evento y anotar su ID
stripe trigger payment_intent.succeeded
# → Output: "Triggered: payment_intent.succeeded (evt_xxx)"

# Reenviar el mismo evento (simula reintento de Stripe)
stripe events resend evt_xxx
```

Log esperado en el **segundo** envío:
```json
{ "level": "INFO", "event": "webhook.skipped", "reason": "already_processed", "eventId": "evt_xxx" }
```

### 4.4 Test de firma inválida

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=invalidsignature000000000000000000000000000000000000000" \
  -d '{"type":"payment_intent.succeeded","data":{"object":{}}}'

# HTTP 400
# { "error": "No signatures found matching the expected signature for payload" }
```

### 4.5 Test de payload sin firma

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}'

# HTTP 400
# { "error": "Missing stripe-signature header" }
```

### 4.6 Eventos con datos personalizados

```bash
# PaymentIntent con importe específico
stripe trigger payment_intent.succeeded \
  --override payment_intent:amount=49900 \
  --override payment_intent:currency=eur \
  --override payment_intent:metadata.plan=enterprise

# Payout fallido con código específico
stripe trigger payout.failed \
  --override payout:failure_code=insufficient_funds \
  --override payout:amount=250000

# Account con payouts deshabilitados (merchant rechazado)
stripe trigger account.updated \
  --override account:charges_enabled=false \
  --override account:payouts_enabled=false \
  --override "account:requirements.disabled_reason=action_required"
```

### 4.7 Ver logs de todos los eventos

```bash
stripe events list --limit 20

# Filtrar por tipo
stripe events list --type payment_intent.succeeded --limit 5

# Detalle completo de un evento
stripe events retrieve evt_xxx | jq .
```

---

## 5. Disputes

Una disputa (chargeback) ocurre cuando el cliente contacta a su banco para
revertir un cargo. Tienes un plazo para responder con evidencia.

### 5.1 Crear un pago que genere disputa automáticamente

```bash
# Esta tarjeta SIEMPRE genera una disputa tras el pago
stripe payment_intents create \
  --amount 5000 \
  --currency eur \
  --payment-method pm_card_createDispute \
  --confirm true \
  --automatic-payment-methods[enabled]=true \
  --automatic-payment-methods[allow-redirects]=never
```

> `pm_card_createDispute` — Stripe crea automáticamente una disputa de tipo `fraudulent`
> con `evidence_due_by` en 7 días (en test el plazo es ficticio).

### 5.2 Tarjetas específicas por tipo de disputa

| Payment Method | Tipo de disputa |
|---|---|
| `pm_card_createDispute` | `fraudulent` |
| `pm_card_createDisputeProductNotReceived` | `product_not_received` |
| `pm_card_createDisputeInquiry` | `inquiry` (sin pérdida automática) |

Usando el número de tarjeta en el Payment Element:
| Número | Disputa generada |
|---|---|
| `4000 0000 0000 2685` | `fraudulent` |
| `4000 0000 0000 2693` | `product_not_received` |

### 5.3 Simular el ciclo completo de disputa

```bash
# Paso 1 — crear la disputa
stripe trigger charge.dispute.created

# Log esperado en el webhook:
# { "event": "dispute.created", "disputeId": "dp_xxx", "reason": "fraudulent", "amount": 1000 }

# Paso 2 — enviar evidencia (via Dashboard o API)
stripe disputes update dp_xxx \
  --evidence[customer_name]="John Doe" \
  --evidence[customer_email_address]="john@example.com" \
  --evidence[uncategorized_text]="El cliente realizó la compra voluntariamente el 2024-01-15"

# Paso 3 — Stripe revisa (simular actualización de estado)
stripe trigger charge.dispute.updated \
  --override dispute:status=under_review

# Paso 4a — Ganada
stripe trigger charge.dispute.closed \
  --override dispute:status=won

# Paso 4b — Perdida
stripe trigger charge.dispute.closed \
  --override dispute:status=lost
```

### 5.4 Verificar el estado de una disputa

```bash
# Ver todas las disputas
stripe disputes list --limit 10

# Detalle con evidencia
stripe disputes retrieve dp_xxx | jq '{
  id: .id,
  status: .status,
  reason: .reason,
  amount: .amount,
  evidence_due_by: .evidence_details.due_by,
  is_charge_refundable: .is_charge_refundable
}'
```

### 5.5 Test de alertas de deadline

El webhook `charge.dispute.created` incluye `evidence_due_by`. Debes guardar
ese timestamp en la columna `evidenceDueBy` de la tabla `disputes` y crear
un cron job que alerte 72h antes:

```bash
# Simular disputa con deadline en 3 días
stripe trigger charge.dispute.created \
  --override "dispute:evidence_details.due_by=1735689600"
# ^ timestamp Unix de hace-3-días-en-test

# El webhook handler debe loguear:
# { "event": "dispute.created", "daysUntilDeadline": 3, "URGENT": true }
```

---

## 6. Refunds

Un reembolso puede ser total o parcial. Con Destination Charges,
si el `applicationFee` fue cobrado, hay que decidir si también se devuelve.

### 6.1 Reembolso total vía API

```bash
# Obtener el Charge ID del pago (ch_xxx, no el pi_xxx)
stripe charges list --limit 1 | jq '.[0].id'

# Reembolso total
stripe refunds create --charge ch_xxx

# Respuesta esperada:
# { "id": "re_xxx", "amount": 10000, "status": "succeeded", "reason": null }
```

### 6.2 Reembolso parcial

```bash
stripe refunds create \
  --charge ch_xxx \
  --amount 3000 \
  --reason requested_by_customer
  # ^ razones: duplicate | fraudulent | requested_by_customer
```

### 6.3 Reembolso desde PaymentIntent (más moderno)

```bash
stripe refunds create \
  --payment-intent pi_xxx \
  --amount 5000
```

### 6.4 Reembolso con devolución de comisión de plataforma

```bash
# En Destination Charges, la comisión (applicationFee) es tuya como plataforma.
# Puedes devolverla total o parcialmente.
stripe application_fees list --limit 1 | jq '.[0].id'

stripe application_fee_refunds create fee_xxx \
  --amount 250
  # Devuelve 2.50 EUR de la comisión al merchant
```

### 6.5 Trigger del webhook `charge.refunded`

```bash
stripe trigger charge.refunded

# Con datos específicos
stripe trigger charge.refunded \
  --override charge:amount_refunded=3000 \
  --override charge:refunded=false
  # refunded=false indica reembolso PARCIAL (hay saldo restante)
  # refunded=true indica reembolso TOTAL
```

Log esperado en el webhook:
```json
{
  "level": "INFO",
  "event": "charge.refunded",
  "chargeId": "ch_xxx",
  "amountRefunded": 3000,
  "currency": "eur",
  "isFullRefund": false
}
```

### 6.6 Tarjeta que devuelve siempre

```bash
# Esta tarjeta aprueba el pago pero siempre falla el reembolso
# (útil para testear el flujo de error en refunds)
# Número: 4000 0000 0000 3238
stripe payment_intents create \
  --amount 5000 \
  --currency eur \
  --payment-method pm_card_chargeDeclinedInsufficientFunds \
  --confirm true

# Luego intentar refund → debe fallar con error
```

### 6.7 Verificar el estado del reembolso

```bash
stripe refunds list --limit 5

stripe refunds retrieve re_xxx | jq '{
  id: .id,
  amount: .amount,
  status: .status,
  reason: .reason,
  failure_reason: .failure_reason
}'
```

---

## 7. Checklist pre-producción

```
CONFIGURACIÓN
[ ] STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY son de live (pk_live_, sk_live_)
[ ] STRIPE_WEBHOOK_SECRET es el del endpoint en Dashboard (no el de stripe listen)
[ ] Webhook endpoint registrado en Dashboard con HTTPS
[ ] Todos los eventos necesarios están suscritos en el endpoint

PAYMENT ELEMENT
[ ] Tarjeta 4242 → redirige a /success con query ?payment_intent=pi_xxx
[ ] Tarjeta 9995 → muestra error inline sin redirigir
[ ] Tarjeta 3155 → muestra flujo 3DS y completa el pago
[ ] El Payment Element no expone la secret key en el navegador

DESTINATION CHARGES
[ ] El balance del merchant aumenta tras cada pago (minus fees)
[ ] La application fee aparece en el balance de la plataforma
[ ] Los refunds totales devuelven el importe correcto al cliente

CONNECT ONBOARDING
[ ] AccountLink expira tras el primer uso
[ ] refresh_url lleva al usuario de vuelta al paso correcto
[ ] Tras completar onboarding: charges_enabled=true, payouts_enabled=true
[ ] El webhook account.updated actualiza el estado en la DB

WEBHOOKS
[ ] Firma verificada: petición sin firma → 400
[ ] Idempotencia: reenviar mismo evento → 200 sin re-procesar
[ ] Todos los eventos logueados en formato JSON estructurado
[ ] Los errores de handler → 200 (no 500, para que Stripe no reintente en cascada)

DISPUTES
[ ] dispute.created guarda evidenceDueBy en la DB
[ ] El dashboard muestra disputas con status NEEDS_RESPONSE resaltadas
[ ] Hay alerta cuando evidenceDueBy < 72h

REFUNDS
[ ] Reembolso total actualiza Payment.refundedAmount = Payment.amount
[ ] Reembolso parcial actualiza Payment.refundedAmount correctamente
[ ] No es posible reembolsar más del importe original (validación en API)
```

---

## 8. Comandos rápidos de referencia

```bash
# ── Setup ──────────────────────────────────────────────────────────────────────
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# ── Crear recursos de test ─────────────────────────────────────────────────────
stripe accounts create --type express --country ES --email test@test.com
stripe customers create --email customer@test.com
stripe payment_methods create --type card --card[number]=4242424242424242 --card[exp_month]=12 --card[exp_year]=2034 --card[cvc]=123

# ── Disparar eventos ───────────────────────────────────────────────────────────
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger payment_intent.canceled
stripe trigger account.updated
stripe trigger charge.refunded
stripe trigger payout.paid
stripe trigger payout.failed
stripe trigger charge.dispute.created
stripe trigger charge.dispute.closed

# ── Inspeccionar estado ────────────────────────────────────────────────────────
stripe balance retrieve
stripe balance retrieve --stripe-account acct_xxx
stripe payment_intents list --limit 5
stripe charges list --limit 5
stripe refunds list --limit 5
stripe disputes list --limit 5
stripe payouts list --limit 5
stripe events list --limit 20

# ── Limpiar datos de test ──────────────────────────────────────────────────────
# (no hay forma de borrar eventos, pero los datos de test están aislados)
# Para reset completo: Stripe Dashboard → Developers → Test data → Delete all
```

---

## 9. Stripe Dashboard — vistas clave durante el test

| Vista | URL |
|---|---|
| Todos los pagos | `dashboard.stripe.com/test/payments` |
| Balance plataforma | `dashboard.stripe.com/test/balance` |
| Connected Accounts | `dashboard.stripe.com/test/connect/accounts` |
| Balance de un merchant | `dashboard.stripe.com/test/connect/accounts/acct_xxx` |
| Disputas abiertas | `dashboard.stripe.com/test/disputes` |
| Reembolsos | `dashboard.stripe.com/test/refunds` |
| Webhooks log | `dashboard.stripe.com/test/webhooks` |
| Logs de API calls | `dashboard.stripe.com/test/logs` |
