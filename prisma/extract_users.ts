
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Fetching users and branches...");

    const branches = await prisma.branch.findMany();
    const users = await prisma.user.findMany();

    console.log("// ==================== EXTRACTED DATA ====================");

    console.log("\n// Branches");
    console.log(JSON.stringify(branches, null, 2));

    console.log("\n// Users");
    console.log(JSON.stringify(users, null, 2));

    console.log("// ==================== END EXTRACTED DATA ====================");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
