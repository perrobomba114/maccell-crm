
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
    console.log("Fetching Repair Statuses...");
    const statuses = await prisma.repairStatus.findMany({
        orderBy: { id: 'asc' }
    });

    if (statuses.length === 0) {
        console.log("No repair statuses found.");
    } else {
        console.log("\nID | Name");
        console.log("---|------------------");
        statuses.forEach(s => {
            console.log(`${s.id.toString().padEnd(2)} | ${s.name}`);
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
