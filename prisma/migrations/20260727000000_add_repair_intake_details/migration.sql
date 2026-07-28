CREATE TYPE "RepairAccessType" AS ENUM ('CODE', 'PATTERN', 'NONE');

ALTER TABLE "repairs"
ADD COLUMN "accessType" "RepairAccessType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "accessCredential" TEXT,
ADD COLUMN "hasSimCard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hasMemoryCard" BOOLEAN NOT NULL DEFAULT false;
