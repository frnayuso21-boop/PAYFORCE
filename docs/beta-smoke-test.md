# PayForce — Beta Smoke Test

Guía de pruebas end-to-end para validar la integración Stripe Connect antes del deploy.

---

## 1. Arranque local

### Variables de entorno

Copia `.env.local.example` como `.env.local` y rellena:

```bash
cp .env.local.example .env.local
```

Valores mínimos para pruebas locales:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # se obtiene con stripe listen (ver paso 3)
DATABASE_URL=postgresql://postgres:password@localhost:5432/payforce
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Comandos de inicio

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma (tras cambio de provider a postgresql)
npx prisma generate

# 3. Crear tablas en la BD
npx prisma migrate dev --name init

# 4. Arrancar servidor Next.js
npm run dev

# 5. En otra terminal — Stripe CLI para webhooks locales
stripe listen --forward-to localhost:3000/api/stripe/webhook
# → Copia el whsec_... que aparece y ponlo en STRIPE_WEBHOOK_SECRET
# → Reinicia el servidor después de actualizar la variable
```

---

## 2. Flujo de prueba — paso a paso

### PASO 1 — Registro y login

1. Abrir `http://localhost:3000/login`
2. Registrarse con email o Google
3. **Resultado esperado**: redirección a `/app/dashboard`
4. **En BD**: `SELECT * FROM users;` → debe aparecer una fila con tu email

---

### PASO 2 — Onboarding Stripe Connect

1. Ir a `/app/connect/onboarding`
2. Rellenar formulario:
   - Email: tu email real
   - País: España (ES)
   - Tipo de negocio: Individual
3. Click "Crear cuenta"
4. **Resultado esperado**: botón "Continuar en Stripe" aparece
5. Click "Continuar en Stripe" → redirige al portal de Stripe
6. En Stripe, usar datos de prueba:
   - Nombre: cualquier nombre
   - Fecha nacimiento: 01/01/1990
   - Dirección: cualquier dirección española
   - Número de cuenta bancaria de test: `ES9121000418450200051332` (IBAN de prueba)
   - Click "Guardar" / completar el flujo
7. **Resultado esperado**: redirección a `/app/connect/status` con estado `ENABLED`
8. **En Stripe Dashboard**: [Connected Accounts](https://dashboard.stripe.com/test/connect/accounts) → debe aparecer tu cuenta
9. **En BD**: `SELECT stripe_account_id, status FROM connected_accounts;` → `status = ENABLED`

---

### PASO 3 — Crear Payment Link

1. Ir a `/app/payment-links`
2. Click "Nuevo link"
3. Rellenar:
   - Importe: `10` (€10,00)
   - Moneda: EUR
   - Descripción: `Test pago beta`
   - Nombre cliente: `Ana García`
   - Email cliente: `ana@test.com`
4. Click "Crear Payment Link"
5. **Resultado esperado**: URL del tipo `http://localhost:3000/pay/abc123...`
6. **En Stripe**: [Payment Intents](https://dashboard.stripe.com/test/payments) → PI con importe 10€, `application_fee_amount = 65` (4% de 1000 + 25 = 65 cts), `transfer_data.destination = acct_...`
7. **En BD**:
   ```sql
   SELECT token, amount, application_fee_amount, status
   FROM payment_links ORDER BY created_at DESC LIMIT 1;
   ```
   → `amount = 1000, application_fee_amount = 65, status = open`

---

### PASO 4 — Pagar como cliente

1. Abrir la URL del payment link en ventana privada (o incógnito)
2. **Resultado esperado**: página de pago con importe `€10,00` y descripción `Test pago beta`
3. Usar tarjeta de prueba Stripe:

| Campo | Valor |
|-------|-------|
| Número | `4242 4242 4242 4242` |
| Fecha | `12/34` |
| CVC | `123` |
| CP | `28001` |

4. Click "Pagar €10,00"
5. **Resultado esperado**: pantalla verde "¡Pago realizado!"
6. **En Stripe Dashboard** → PaymentIntent: `status = succeeded`, `amount_received = 1000`, `application_fee_amount = 65`
7. **En el Connected Account de Stripe** → balance incrementado en `935` cts (€9,35)

---

### PASO 5 — Verificar webhook

En la terminal donde corre `stripe listen` deberías ver:

```
--> payment_intent.succeeded [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe/webhook
```

**En BD** (verificar registros creados):

```sql
-- Webhook registrado como idempotente
SELECT id, type, status FROM webhook_events ORDER BY processed_at DESC LIMIT 1;
-- → type = payment_intent.succeeded, status = PROCESSED

-- Pago guardado
SELECT stripe_payment_intent_id, amount, application_fee_amount, net_amount, status
FROM payments ORDER BY created_at DESC LIMIT 1;
-- → amount=1000, application_fee_amount=65, net_amount=935, status=SUCCEEDED

-- MerchantSplit creado y pagado
SELECT total_amount, platform_fee, amount_to_pay_merchant, status, paid_at
FROM merchant_splits ORDER BY created_at DESC LIMIT 1;
-- → total_amount=1000, platform_fee=65, amount_to_pay_merchant=935, status=paid

-- PaymentLink marcado como pagado
SELECT status, used_count FROM payment_links ORDER BY created_at DESC LIMIT 1;
-- → status=paid, used_count=1
```

---

### PASO 6 — Verificar Dashboard merchant

1. Ir a `/app/app/dashboard` (o `/app/dashboard`)
2. **Resultado esperado**:
   - Volumen del mes: `€10,00`
   - Fees PayForce: `€0,65`
   - Balance disponible: datos reales de la cuenta Connect del merchant
3. **IMPORTANTE**: el balance mostrado debe ser el del connected account, no el de la plataforma

---

### PASO 7 — Verificar Payouts

1. Ir a `/app/payouts`
2. **Resultado esperado**:
   - 1 liquidación con estado `Pagado`
   - Importe: `€9,35`
   - Fee: `€0,65`
   - Referencia: PI ID parcial (pi_...)

---

### PASO 8 — Probar Refund

1. Desde el dashboard, buscar el pago → botón Reembolsar (o via Stripe Dashboard)
2. O via API directa:

```bash
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Content-Type: application/json" \
  -H "Cookie: [pega tu cookie de sesión]" \
  -d '{"payment_intent_id": "pi_xxx"}'
```

3. **Resultado esperado en Stripe**:
   - Refund creado con `reverse_transfer = true` y `refund_application_fee = true`
   - El connected account pierde los €9,35 (transfer revertida)
   - El cliente recibe los €10,00 de vuelta
4. **En BD**: `refunded_amount = 1000` en la fila de `payments`

---

## 3. Tarjetas de prueba adicionales

| Escenario | Número |
|-----------|--------|
| Pago exitoso | `4242 4242 4242 4242` |
| Pago rechazado | `4000 0000 0000 0002` |
| 3D Secure requerido | `4000 0025 0000 3155` |
| Fondos insuficientes | `4000 0000 0000 9995` |

Fecha: cualquier fecha futura. CVC: cualquier 3 dígitos.

---

## 4. Verificación del webhook con reintento

Para probar idempotencia (enviar el mismo evento dos veces):

```bash
# Obtener el ID del último evento
stripe events list --limit 1

# Reenviar el mismo evento
stripe events resend evt_xxx
```

**Resultado esperado**: el segundo evento se registra como `already_processed` en logs — NO crea un segundo Payment ni MerchantSplit.

---

## 5. Checklist pre-deploy producción

```
[ ] Cambiar sk_test_ → sk_live_ en STRIPE_SECRET_KEY
[ ] Cambiar pk_test_ → pk_live_ en NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
[ ] Configurar endpoint webhook en Stripe Dashboard (Developers → Webhooks)
    URL: https://tu-dominio.com/api/stripe/webhook
    Eventos: payment_intent.succeeded, payment_intent.payment_failed,
             payment_intent.canceled, charge.refunded, charge.dispute.created,
             charge.dispute.closed, payout.paid, payout.failed,
             account.updated, account.application.deauthorized
[ ] Copiar el signing secret (whsec_...) a STRIPE_WEBHOOK_SECRET en producción
[ ] Verificar NEXT_PUBLIC_APP_URL = https://tu-dominio-real.com (sin barra final)
[ ] DATABASE_URL apuntando a PostgreSQL de producción
[ ] npx prisma migrate deploy (en producción, no dev)
[ ] Activar Stripe Connect Express en Stripe Dashboard → Settings → Connect
[ ] Configurar redirect URLs en Supabase (Authentication → URL Configuration)
```

---

## 6. Comandos útiles de diagnóstico

```bash
# Ver logs del webhook en tiempo real
stripe listen --forward-to localhost:3000/api/stripe/webhook --log-level debug

# Ver todos los payment intents de test
stripe payment_intents list --limit 5

# Ver connected accounts
stripe accounts list --limit 5

# Ver balance de un connected account
stripe balance retrieve --stripe-account acct_xxx

# Ver webhook events en Stripe
stripe events list --limit 10
```
