
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Testing Stock Query...");
    const query = ""; // Test empty first, then try "Display" or something.

    const whereClause = query ? {
        OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { sku: { contains: query, mode: 'insensitive' as const } },
            { brand: { contains: query, mode: 'insensitive' as const } },
            { category: { name: { contains: query, mode: 'insensitive' as const } } }
        ]
    } : {};

    // @ts-ignore
    const count = await prisma.sparePart.count({ where: whereClause });
    console.log(`Total found: ${count}`);

    // @ts-ignore
    const items = await prisma.sparePart.findMany({
        where: whereClause,
        take: 5,
        select: { id: true, name: true, sku: true, category: { select: { name: true } } }
    });

    console.log("Sample items:", items);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
