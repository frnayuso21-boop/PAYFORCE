// Mock de transacciones para el dashboard.
// Usa un tipo local simplificado (MockTransaction) porque la estructura
// de UI difiere del modelo Payment de la BD (que viene de Stripe webhooks).

export type MockTransactionStatus = "succeeded" | "pending" | "failed" | "refunded";
export type MockTransactionType   = "charge" | "refund" | "payout" | "transfer";

export interface MockTransaction {
  id:           string;
  stripeId:     string;
  customerId:   string;
  customerName: string;
  amount:       number;    // céntimos
  currency:     string;
  status:       MockTransactionStatus;
  type:         MockTransactionType;
  description:  string;
  createdAt:    string;
}

export const mockTransactions: MockTransaction[] = [
  {
    id:           "txn_01",
    stripeId:     "ch_1ABC123",
    customerId:   "cus_01",
    customerName: "Carlos Martínez",
    amount:       29900,
    currency:     "eur",
    status:       "succeeded",
    type:         "charge",
    description:  "Suscripción Pro - Mensual",
    createdAt:    "2026-02-20T08:30:00Z",
  },
  {
    id:           "txn_02",
    stripeId:     "ch_2DEF456",
    customerId:   "cus_02",
    customerName: "Laura Pérez",
    amount:       89900,
    currency:     "eur",
    status:       "succeeded",
    type:         "charge",
    description:  "Suscripción Enterprise - Mensual",
    createdAt:    "2026-02-19T15:10:00Z",
  },
  {
    id:           "txn_03",
    stripeId:     "ch_3GHI789",
    customerId:   "cus_03",
    customerName: "Javier López",
    amount:       4900,
    currency:     "eur",
    status:       "pending",
    type:         "charge",
    description:  "Suscripción Starter - Mensual",
    createdAt:    "2026-02-19T12:00:00Z",
  },
  {
    id:           "txn_04",
    stripeId:     "re_4JKL012",
    customerId:   "cus_04",
    customerName: "Ana García",
    amount:       -29900,
    currency:     "eur",
    status:       "refunded",
    type:         "refund",
    description:  "Reembolso suscripción Pro",
    createdAt:    "2026-02-18T10:00:00Z",
  },
  {
    id:           "txn_05",
    stripeId:     "ch_5MNO345",
    customerId:   "cus_06",
    customerName: "Sofía Romero",
    amount:       89900,
    currency:     "eur",
    status:       "succeeded",
    type:         "charge",
    description:  "Suscripción Enterprise - Mensual",
    createdAt:    "2026-02-17T09:45:00Z",
  },
  {
    id:           "txn_06",
    stripeId:     "ch_6PQR678",
    customerId:   "cus_05",
    customerName: "Pedro Sánchez",
    amount:       4900,
    currency:     "eur",
    status:       "failed",
    type:         "charge",
    description:  "Suscripción Starter - Mensual",
    createdAt:    "2026-02-16T18:20:00Z",
  },
  {
    id:           "txn_07",
    stripeId:     "po_7STU901",
    customerId:   "cus_01",
    customerName: "Carlos Martínez",
    amount:       245000,
    currency:     "eur",
    status:       "succeeded",
    type:         "payout",
    description:  "Liquidación a cuenta bancaria",
    createdAt:    "2026-02-15T10:00:00Z",
  },
];

export const mockDashboardStats = {
  totalRevenue:    24850.75,
  totalPayouts:    9220.50,
  activeCustomers: 4,
  pendingPayouts:  2320.50,
  revenueChange:   12.5,
  payoutsChange:   8.3,
  customersChange: 2,
};

export const mockPlans = [
  {
    id:            "plan_starter",
    name:          "Starter",
    price:         49,
    currency:      "eur",
    interval:      "month" as const,
    stripePriceId: "price_starter_monthly",
    features: [
      "Hasta 100 transacciones/mes",
      "1 cuenta Stripe Connect",
      "Soporte por email",
      "Dashboard básico",
    ],
  },
  {
    id:            "plan_pro",
    name:          "Pro",
    price:         299,
    currency:      "eur",
    interval:      "month" as const,
    stripePriceId: "price_pro_monthly",
    popular:       true,
    features: [
      "Transacciones ilimitadas",
      "5 cuentas Stripe Connect",
      "Soporte prioritario",
      "Dashboard avanzado",
      "Pagos instantáneos",
      "Webhooks personalizados",
    ],
  },
  {
    id:            "plan_enterprise",
    name:          "Enterprise",
    price:         899,
    currency:      "eur",
    interval:      "month" as const,
    stripePriceId: "price_enterprise_monthly",
    features: [
      "Todo de Pro",
      "Cuentas Connect ilimitadas",
      "Manager de cuenta dedicado",
      "SLA 99.9%",
      "Integraciones personalizadas",
      "Facturación personalizada",
    ],
  },
];
