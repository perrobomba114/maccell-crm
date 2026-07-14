-- Additive only: existing repair rows, statuses and history remain untouched.
CREATE TABLE "repair_learning_records" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "confirmingEvidence" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "verification" TEXT NOT NULL,
    "affectedReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "schematicPages" JSONB,
    "externalSources" JSONB,
    "authority" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "trainingEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_learning_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repair_learning_records_repairId_key" ON "repair_learning_records"("repairId");
CREATE INDEX "repair_learning_records_authority_trainingEligible_idx" ON "repair_learning_records"("authority", "trainingEligible");
CREATE INDEX "repair_learning_records_technicianId_idx" ON "repair_learning_records"("technicianId");

ALTER TABLE "repair_learning_records"
ADD CONSTRAINT "repair_learning_records_repairId_fkey"
FOREIGN KEY ("repairId") REFERENCES "repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
