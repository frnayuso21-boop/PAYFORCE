-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'MERCHANT',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "stripeAccountId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'ES',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "payoutSchedule" TEXT NOT NULL DEFAULT 'WEEKLY',
    "stripeMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "totalSpend" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "connectedAccountId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "applicationFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "paymentLinkId" TEXT,
    "stripeCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "connectedAccountId" TEXT NOT NULL,
    "createdById" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "applicationFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_splits" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "amountToPayMerchant" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "stripePayoutId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'STANDARD',
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "stripeDisputeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceDueBy" TIMESTAMP(3),
    "evidenceSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_supabaseId_idx" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_stripeAccountId_key" ON "connected_accounts"("stripeAccountId");

-- CreateIndex
CREATE INDEX "connected_accounts_userId_idx" ON "connected_accounts"("userId");

-- CreateIndex
CREATE INDEX "connected_accounts_stripeAccountId_idx" ON "connected_accounts"("stripeAccountId");

-- CreateIndex
CREATE INDEX "connected_accounts_status_idx" ON "connected_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_stripeCustomerId_key" ON "customers"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "customers_connectedAccountId_idx" ON "customers"("connectedAccountId");

-- CreateIndex
CREATE INDEX "customers_stripeCustomerId_idx" ON "customers"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_connectedAccountId_email_key" ON "customers"("connectedAccountId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeChargeId_key" ON "payments"("stripeChargeId");

-- CreateIndex
CREATE INDEX "payments_connectedAccountId_idx" ON "payments"("connectedAccountId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_connectedAccountId_status_createdAt_idx" ON "payments"("connectedAccountId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_token_key" ON "payment_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_stripePaymentIntentId_key" ON "payment_links"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "payment_links_token_idx" ON "payment_links"("token");

-- CreateIndex
CREATE INDEX "payment_links_connectedAccountId_idx" ON "payment_links"("connectedAccountId");

-- CreateIndex
CREATE INDEX "payment_links_status_idx" ON "payment_links"("status");

-- CreateIndex
CREATE INDEX "payment_links_expiresAt_idx" ON "payment_links"("expiresAt");

-- CreateIndex
CREATE INDEX "payment_links_connectedAccountId_status_idx" ON "payment_links"("connectedAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_splits_paymentId_key" ON "merchant_splits"("paymentId");

-- CreateIndex
CREATE INDEX "merchant_splits_connectedAccountId_idx" ON "merchant_splits"("connectedAccountId");

-- CreateIndex
CREATE INDEX "merchant_splits_status_idx" ON "merchant_splits"("status");

-- CreateIndex
CREATE INDEX "merchant_splits_createdAt_idx" ON "merchant_splits"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_stripePayoutId_key" ON "payouts"("stripePayoutId");

-- CreateIndex
CREATE INDEX "payouts_connectedAccountId_idx" ON "payouts"("connectedAccountId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_arrivalDate_idx" ON "payouts"("arrivalDate");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_stripeDisputeId_key" ON "disputes"("stripeDisputeId");

-- CreateIndex
CREATE INDEX "disputes_connectedAccountId_idx" ON "disputes"("connectedAccountId");

-- CreateIndex
CREATE INDEX "disputes_paymentId_idx" ON "disputes"("paymentId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "disputes_connectedAccountId_status_idx" ON "disputes"("connectedAccountId", "status");

-- CreateIndex
CREATE INDEX "webhook_events_type_idx" ON "webhook_events"("type");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "payment_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_splits" ADD CONSTRAINT "merchant_splits_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_splits" ADD CONSTRAINT "merchant_splits_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

