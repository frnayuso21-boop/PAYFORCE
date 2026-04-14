# PayForce — Bloque de revisión y verificación

## Estado actual (análisis)

### 1. Core de pagos ✅

| Componente | Estado | Notas |
|------------|--------|-------|
| `/checkout` | OK | CheckoutForm → create-intent → Payment Element + Express Checkout |
| `/pay/[token]` | OK | Lazy creation o PI existente, PayCheckout con Payment Element |
| Webhook | OK | `payment_intent.succeeded`, MerchantSplit, idempotencia |
| Refunds | OK | requireAuth, ownership por connectedAccountId |
| Dashboard | OK | getUserAccountIds, métricas filtradas; accountIds vacío → ceros |

### 2. Multi-merchant ✅

| Requisito | Estado |
|-----------|--------|
| Persistir ConnectedAccount al crearla | ✅ `connect/account` POST hace upsert con userId |
| Asociar al usuario autenticado | ✅ userId en create/update |
| Dashboard usa cuenta principal | ✅ getUserAccountIds |
| Payment links usan cuenta principal | ✅ getUserPrimaryAccount cuando no hay bodyAccountId |
| create-intent usa cuenta | Opcional: checkout no pasa connectedAccountId (planes PayForce) |
| CONNECTED_ACCOUNT_ID hardcodeado | ❌ No existe en el código |

### 3. Páginas mock → datos reales ✅

| Página | Estado |
|--------|--------|
| `/app/connect` | Datos reales (dbUser.connectedAccounts) |
| `/app/payouts` | Datos reales (MerchantSplits por accountIds) |
| `/app/customers` | Datos reales (Customer o derivado de Payment) |

---

## Bug detectado

**GET /api/payments**: Cuando `accountIds.length === 0`, `accountFilter = {}` devuelve **todos** los pagos de la plataforma. Debe devolver lista vacía (igual que dashboard overview).

---

## Plan de ejecución

1. **Corregir** el bug en `/api/payments` (accountIds vacío → respuesta vacía).
2. **Verificar** que no hay más fugas similares.
3. **Probar** cada flujo según la checklist.

---

## Archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `src/app/api/payments/route.ts` | Si accountIds.length === 0 → devolver { data: [], meta } sin consultar BD |

---

## Orden de implementación

1. Aplicar fix en `api/payments/route.ts`.
2. Ejecutar pruebas manuales.

---

## Cómo probar cada paso

### Paso 1 — Core de pagos

1. **/checkout**
   - Ir a http://localhost:3000/checkout
   - Seleccionar plan, rellenar datos de pago
   - Usar tarjeta test `4242 4242 4242 4242`
   - Esperar redirección a /success

2. **/pay/[token]**
   - Crear payment link desde /app/payment-links (requiere login + cuenta conectada)
   - Abrir la URL generada
   - Pagar con tarjeta test
   - Verificar redirección con ?paid=true

3. **Webhook**
   - Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Disparar evento de pago o usar flujo real
   - Verificar que el pago aparece en dashboard

4. **Refunds**
   - Desde dashboard, refund de un pago completado
   - Verificar que el estado se actualiza

5. **Dashboard**
   - Login → /app/dashboard
   - Ver métricas, gráfico, lista de pagos
   - Usuario sin cuentas: métricas en cero

### Paso 2 — Multi-merchant

1. **Usuario A**: Login → Connect → Crear cuenta → Completar onboarding
2. **Usuario B**: Otro email, mismo flujo
3. **Usuario A**: Crear payment link → pagar como cliente
4. **Usuario B**: Dashboard → no debe ver el pago de A
5. **Usuario A**: Dashboard → solo sus pagos

### Paso 3 — Páginas reales

1. **/app/connect**: Ver cuenta conectada o CTA para conectar
2. **/app/payouts**: Ver liquidaciones (MerchantSplits) o empty state
3. **/app/customers**: Ver clientes derivados de pagos o empty state
