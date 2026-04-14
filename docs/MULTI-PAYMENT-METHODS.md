# PayForce — Múltiples métodos de pago

## 1. Análisis del flujo actual

### Rutas de cobro

| Ruta | Uso | PaymentIntent | Métodos |
|------|-----|---------------|---------|
| `/checkout` | Suscripciones (planes mock) | `POST /api/payments/create-intent` | Payment Element + Express Checkout |
| `/pay/[token]` | Payment Links públicos | Lazy creation en page.tsx o PI existente | Payment Element + Express Checkout |

### Backend — PaymentIntents

| Origen | Archivo | `automatic_payment_methods` |
|--------|---------|----------------------------|
| Checkout | `api/payments/create-intent/route.ts` | ✅ `{ enabled: true }` |
| Payment Links (creación) | `api/payment-links/route.ts` | ✅ `{ enabled: true }` |
| Payment Links (lazy) | `pay/[token]/page.tsx` | ✅ `{ enabled: true }` |

### Frontend — Elementos Stripe

| Componente | Archivo | Payment Element | Express Checkout | loader |
|------------|---------|----------------|------------------|--------|
| Checkout | `CheckoutForm.tsx` | ✅ layout: tabs | ✅ Apple Pay, Google Pay, Link | auto |
| Payment Link | `PayCheckout.tsx` | ✅ layout: tabs | ✅ Apple Pay, Google Pay, Link | auto |

---

## 2. Métodos de pago soportados hoy

### Payment Element (tarjetas, SEPA, iDEAL, Klarna…)

Con `automatic_payment_methods: { enabled: true }`, Stripe muestra **todos los métodos habilitados en el Dashboard** según:

- Moneda del pago
- País del cliente
- Configuración en [Stripe Dashboard → Payment methods](https://dashboard.stripe.com/settings/payment_methods)

**Típicamente disponibles (si están activos en Dashboard):**

- Tarjetas (Visa, Mastercard, Amex…)
- SEPA Direct Debit
- iDEAL (Países Bajos)
- Bancontact (Bélgica)
- Klarna (aparece también en Payment Element)
- Giropay, Sofort, etc.

### Express Checkout Element (one-click)

| Método | Estado actual | Requisitos |
|--------|--------------|------------|
| Apple Pay | ✅ `always` | Safari/macOS, dominio registrado |
| Google Pay | ✅ `always` | Chrome/Android, cuenta Google |
| Link | ✅ `auto` | Usuario con cuenta Link |
| PayPal | ❌ `never` | Habilitar en Dashboard |
| Klarna | No configurado | Habilitar en Dashboard |
| Amazon Pay | No configurado | Habilitar en Dashboard |

---

## 3. Qué falta para más métodos

1. **PayPal, Klarna, Amazon Pay** en Express Checkout: cambiar de `never` / omitido a `auto`.
2. **Habilitar en Stripe Dashboard**: PayPal, Klarna, Amazon Pay requieren activación en [Payment methods](https://dashboard.stripe.com/settings/payment_methods).
3. **Registro de dominio** para Apple Pay: [Stripe → Settings → Payment methods → Apple Pay](https://dashboard.stripe.com/settings/payment_methods).

---

## 4. Cómo probar

### Local (localhost)

1. **Tarjetas**: Usar [tarjetas de test Stripe](https://docs.stripe.com/testing#cards):
   - `4242 4242 4242 4242` — éxito
   - `4000 0025 0000 3155` — 3D Secure

2. **Apple Pay**: Solo en Safari (macOS/iOS). Registrar `localhost` en Stripe Dashboard (modo test).

3. **Google Pay**: Chrome con cuenta Google. En test, Stripe simula el flujo.

4. **Link**: Crear cuenta Link en [link.com](https://link.com) con email de test.

5. **PayPal**: Habilitar en Dashboard. En test, usar cuenta sandbox de PayPal.

6. **Klarna**: Habilitar en Dashboard. Disponible según moneda/país (p. ej. EUR, USD).

### Producción

1. Registrar dominio real en Stripe (Apple Pay).
2. Activar métodos deseados en Dashboard (PayPal, Klarna, Amazon Pay).
3. Probar con tarjetas reales o cuentas reales de cada método.

---

## 5. Archivos modificados (implementación)

| Archivo | Cambio |
|---------|--------|
| `src/app/checkout/CheckoutForm.tsx` | `paypal: "auto"`, `klarna: "auto"`, `amazonPay: "auto"` en ExpressCheckoutElement |
| `src/app/pay/[token]/PayCheckout.tsx` | Igual |
| `api/payments/create-intent` | Ya tenía `automatic_payment_methods` ✓ |
| `pay/[token]/page.tsx` | Ya tenía `automatic_payment_methods` ✓ |
| `api/payment-links/route.ts` | Ya tenía `automatic_payment_methods` ✓ |

---

## 6. MOR y webhook

- **MOR**: Intacto. PayForce cobra el 100% y aplica fee; `transfer_data` solo en payment links con `connectedAccountId`.
- **Webhook**: Sin cambios. `payment_intent.succeeded` procesa todos los métodos igual.
