# PayForce — Pruebas end-to-end Stripe Connect

## Análisis de lo que se corrigió

| Área | Antes | Después |
|------|-------|---------|
| **POST /api/connect/account** | Status fijo "PENDING", sin defaultCurrency | Status derivado de Stripe, defaultCurrency, businessName |
| **POST /api/connect/account-link** | Ya usaba getUserPrimaryAccount | Sin cambios (correcto) |
| **/app/connect** | Solo datos de BD, sin requisitos | Sync con Stripe, requisitos pendientes, capabilities reales |
| **Webhook account.updated** | Actualizaba status y capabilities | También businessName y defaultCurrency |
| **Helpers** | getUserPrimaryAccount, getUserAccountIds | Sin cambios (correctos) |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/connect.ts` | Nuevo: resolveConnectStatus, formatRequirements |
| `src/app/api/connect/account/route.ts` | Status, defaultCurrency, businessName desde Stripe |
| `src/app/api/connect/account-link/route.ts` | Sin cambios |
| `src/app/api/stripe/webhook/route.ts` | Usa resolveConnectStatus, actualiza businessName/defaultCurrency |
| `src/app/app/connect/page.tsx` | Sync con Stripe, requisitos pendientes |
| `src/app/app/connect/status/page.tsx` | Usa lib/connect (elimina duplicación) |

## Cómo probar el flujo end-to-end

### Requisitos previos

- Servidor en marcha: `npm run dev`
- Supabase configurado en `.env.local` (o modo bypass en login)
- Stripe en modo test con claves válidas

---

### a) Login

1. Ir a http://localhost:3000/login
2. Si Supabase no está configurado: clic en "Entrar al dashboard →"
3. Si está configurado: introducir email → recibir código → verificar
4. Debe redirigir a `/app/dashboard`

---

### b) Crear cuenta Connect

1. Ir a http://localhost:3000/app/connect
2. Debe mostrar "Sin cuenta conectada" con botón "Conectar cuenta"
3. Clic en "Conectar cuenta" → ir a `/app/connect/onboarding`
4. Rellenar formulario:
   - Email del negocio (ej. `merchant@test.com`)
   - País (ej. España)
   - Tipo: Autónomo o Empresa
5. Clic en "Crear y continuar en Stripe"
6. Debe aparecer la fase "Continuar en Stripe" con el accountId
7. Verificar en BD: `ConnectedAccount` con `userId`, `stripeAccountId`, `email`, `status: PENDING`

---

### c) Generar onboarding link

1. En la misma página de onboarding
2. Clic en "Continuar onboarding en Stripe"
3. Debe redirigir a Stripe (URL tipo `connect.stripe.com/...`)
4. Completar el onboarding de prueba en Stripe (datos de test)
5. Stripe redirige a `/app/connect/status` (return_url)

---

### d) Volver y ver estado en /app/connect

1. Ir a http://localhost:3000/app/connect
2. Debe mostrar:
   - Cuenta conectada con stripeAccountId (acct_xxx)
   - Email, país, moneda
   - Capabilities: cobros, payouts, KYC
   - Si hay requisitos pendientes: lista en español
   - Si status = ENABLED: banner "Lista para cobrar" y CTA a Payment Links
3. Ir a `/app/connect/status` para ver detalle completo y requisitos

---

### e) Usar esa cuenta como merchant principal

1. Con cuenta ENABLED, ir a http://localhost:3000/app/payment-links
2. Clic en "Nuevo link"
3. Rellenar: importe (ej. 1000 = €10), descripción
4. Crear → debe generar URL
5. Abrir la URL en otra pestaña (o incógnito)
6. Pagar con tarjeta test `4242 4242 4242 4242`
7. Verificar en dashboard: el pago aparece asociado al merchant
8. Verificar en `/app/payouts`: aparece la liquidación pendiente

---

## Checklist rápida

- [ ] Login funciona (con o sin Supabase)
- [ ] /app/connect muestra estado vacío si no hay cuenta
- [ ] Crear cuenta → POST /api/connect/account → BD actualizada
- [ ] Account link → redirección a Stripe
- [ ] Volver de Stripe → /app/connect/status
- [ ] /app/connect muestra datos reales, capabilities, requisitos
- [ ] Payment link creado usa la cuenta del usuario
- [ ] Pago completado aparece en dashboard del merchant
- [ ] Otro usuario no ve los pagos del primero
