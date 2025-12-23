
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log("Checking Prisma Client fields...");

        try {
            // Update with valid-looking ID but random
            await prisma.sparePart.update({
                where: { id: "dummy-id" },
                data: {
                    pricePos: 100
                }
            });
        } catch (e: any) {
            if (e.message.includes("Record to update not found")) {
                console.log("SUCCESS: Client recognized 'pricePos' (got expected RecordNotFound)");
            } else if (e.message.includes("Unknown argument")) {
                console.error("FAILURE: Client does NOT know 'pricePos'");
                console.error(e.message);
                process.exit(1);
            } else {
                console.log("OTHER ERROR (Validation likely passed):", e.message);
            }
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
