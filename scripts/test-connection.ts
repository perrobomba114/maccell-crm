
import { db } from "../src/lib/db";

async function main() {
    console.log("Testing database connection...");
    try {
        const userCount = await db.user.count();
        console.log(`Connection successful! found ${userCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error("Connection failed:", error);
        process.exit(1);
    }
}

main();
