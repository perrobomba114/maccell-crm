
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
    const statusId = 6;
    const newName = "Finalizado No Reparado";

    console.log(`Updating Status ID ${statusId} to "${newName}"...`);

    const updated = await prisma.repairStatus.update({
        where: { id: statusId },
        data: { name: newName }
    });

    console.log("Update successful:");
    console.log(`${updated.id} | ${updated.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
