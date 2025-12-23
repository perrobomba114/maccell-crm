import 'dotenv/config'
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
    try {
        console.log("Initializing adapter...");
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error("DATABASE_URL is missing");

        const pool = new pg.Pool({ connectionString });
        const adapter = new PrismaPg(pool);

        console.log("Initializing PrismaClient with adapter...");
        // @ts-ignore
        const prisma = new PrismaClient({ adapter });

        console.log("Connecting...");
        // Try a simple query
        const count = await prisma.user.count();
        console.log(`Connection successful! found ${count} users.`);
    } catch (e) {
        console.error("Connection failed with adapter:", e);
    }
}

main();
