import type { ConnectAccount } from "@/types";

export const mockConnectAccount: ConnectAccount = {
  id: "ca_01",
  stripeAccountId: "acct_1ABC123DEF456GHI",
  businessName: "Payforce Solutions SL",
  email: "billing@payforce.dev",
  country: "ES",
  currency: "eur",
  status: "enabled",
  payoutsEnabled: true,
  chargesEnabled: true,
  detailsSubmitted: true,
  createdAt: "2024-01-20T12:00:00Z",
};

export const mockConnectAccountPending: ConnectAccount = {
  id: "ca_02",
  stripeAccountId: "acct_2XYZ789JKL012MNO",
  businessName: "Demo Business",
  email: "demo@example.com",
  country: "ES",
  currency: "eur",
  status: "pending",
  payoutsEnabled: false,
  chargesEnabled: false,
  detailsSubmitted: false,
  createdAt: "2024-03-10T08:00:00Z",
};
