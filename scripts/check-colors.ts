
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
    console.log("Fetching Repair Status Colors...");
    const statuses = await prisma.repairStatus.findMany({
        orderBy: { id: 'asc' }
    });

    console.log("\nID | Name | Color");
    console.log("---|---|---");
    statuses.forEach(s => {
        console.log(`${s.id.toString().padEnd(2)} | ${s.name.padEnd(25)} | ${s.color}`);
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
