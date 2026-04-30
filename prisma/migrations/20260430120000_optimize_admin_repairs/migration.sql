-- Optimize /admin/repairs filtering, pagination, polling, and technician day cards.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "repairs_createdAt_idx" ON "repairs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_updatedAt_idx" ON "repairs" ("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_branchId_createdAt_idx" ON "repairs" ("branchId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_branchId_statusId_createdAt_idx" ON "repairs" ("branchId", "statusId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_isWarranty_createdAt_idx" ON "repairs" ("isWarranty", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_assignedUserId_statusId_createdAt_idx" ON "repairs" ("assignedUserId", "statusId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repairs_assignedUserId_statusId_finishedAt_idx" ON "repairs" ("assignedUserId", "statusId", "finishedAt" DESC);

CREATE INDEX IF NOT EXISTS "repair_status_history_repairId_createdAt_idx" ON "repair_status_history" ("repairId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repair_status_history_userId_toStatusId_createdAt_idx" ON "repair_status_history" ("userId", "toStatusId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "repair_status_history_toStatusId_createdAt_idx" ON "repair_status_history" ("toStatusId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "repairs_ticketNumber_trgm_idx" ON "repairs" USING GIN ("ticketNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "repairs_deviceBrand_trgm_idx" ON "repairs" USING GIN ("deviceBrand" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "repairs_deviceModel_trgm_idx" ON "repairs" USING GIN ("deviceModel" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING GIN ("phone" gin_trgm_ops);
