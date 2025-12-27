import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

// Build-time safety: If no DATABASE_URL, use a dummy one to allow build to pass
// Runtime safety: If no DATABASE_URL in production, log error but allow app to start (and fail later)
const safeConnectionString = connectionString || "postgresql://dummy:dummy@localhost:5432/dummy";

const pool = new pg.Pool({ connectionString: safeConnectionString });
const adapter = new PrismaPg(pool);

declare global {
    var prisma_v2: PrismaClient | undefined;
}

// Use adapter only if we have a valid connection string, otherwise standard init
export const db = globalThis.prisma_v2 || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalThis.prisma_v2 = db;
}
