
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
    console.log("Checking Categories of SpareParts...");

    // Group spare parts by category and show the category type
    const parts = await prisma.sparePart.findMany({
        take: 50,
        select: {
            name: true,
            category: {
                select: {
                    name: true,
                    type: true
                }
            }
        }
    });

    console.log("Sample Data:");
    parts.forEach(p => {
        const catName = p.category?.name || "No Category";
        const catType = p.category?.type || "UNKNOWN";
        console.log(`[${catType}] ${catName}: ${p.name}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
