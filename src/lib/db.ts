import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

declare global {
    var prisma_v2: PrismaClient | undefined;
}

export const db = globalThis.prisma_v2 || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalThis.prisma_v2 = db;
}
