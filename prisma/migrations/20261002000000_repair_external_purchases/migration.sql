CREATE TABLE "repair_external_purchases" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0 AND "quantity" <= 1000),
    "unitCost" DECIMAL(14,2) NOT NULL CHECK ("unitCost" > 0),
    "totalCost" DECIMAL(16,2) NOT NULL CHECK ("totalCost" = "unitCost" * "quantity"),
    "purchasedAt" DATE NOT NULL,
    "receipt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repair_external_purchases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "repair_external_purchases_repairId_requestId_key" ON "repair_external_purchases"("repairId", "requestId");
CREATE INDEX "repair_external_purchases_purchasedAt_idx" ON "repair_external_purchases"("purchasedAt");
CREATE INDEX "repair_external_purchases_userId_idx" ON "repair_external_purchases"("userId");
ALTER TABLE "repair_external_purchases" ADD CONSTRAINT "repair_external_purchases_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "repairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repair_external_purchases" ADD CONSTRAINT "repair_external_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
