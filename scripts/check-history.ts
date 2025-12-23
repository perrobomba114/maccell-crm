
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
    console.log("Checking for History Repairs (Status 5, 6, 10)...");

    const count = await prisma.repair.count({
        where: {
            statusId: { in: [5, 6, 10] }
        }
    });

    const allRepairs = await prisma.repair.count();

    console.log(`Total Repairs: ${allRepairs}`);
    console.log(`History Repairs (5,6,10): ${count}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
