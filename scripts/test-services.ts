import { businessHoursService } from "../src/lib/services/business-hours";
import { ticketService } from "../src/lib/services/tickets";
import { customerService } from "../src/lib/services/customers";
import { db } from "../src/lib/db";

async function main() {
    console.log("🧪 Starting Service Tests...");

    // 1. Business Hours Test
    console.log("\n🕐 Testing Business Hours...");
    // Date: Saturday, Dec 13 2025, 20:30 (Assuming 2025 calendar).
    // Dec 10 2025 is Wednesday (from seed).
    // Dec 13 is Saturday.
    const saturdayNight = new Date("2025-12-13T20:30:00");
    // +60 mins -> Should be Monday Dec 15 09:30.
    const resultDate = businessHoursService.addBusinessMinutes(saturdayNight, 60);

    console.log(`Start: ${saturdayNight.toISOString()}`);
    console.log(`Result: ${resultDate.toISOString()}`);

    const expected = new Date("2025-12-15T09:30:00"); // Mon 9:30
    if (resultDate.getTime() === expected.getTime()) {
        console.log("✅ Business Hours Test PASSED");
    } else {
        console.error("❌ Business Hours Test FAILED");
        console.error(`Expected: ${expected.toISOString()}`);
    }

    // 2. Ticket Service Test
    console.log("\n🎫 Testing Ticket Service...");
    const testBranchId = "test-branch-id";
    const testTicket = "TEST-TICKET-Unique";

    // Cleanup first
    await db.repair.deleteMany({ where: { ticketNumber: testTicket } });

    // Check before create
    const check1 = await ticketService.validateTicketUnique(testTicket, testBranchId);
    console.log(`Check before create: ${check1} (Expected: true)`);

    // Create dummy repair to occupy ticket
    // We need customer and user relations.
    // Use Seeded User/Branch/Customer if possible or create dummy.
    // I'll grab first user/branch/customer from seed validation or DB.
    const user = await db.user.findFirst();
    const branch = await db.branch.findFirst();
    let customer = await db.customer.findFirst();

    if (!user || !branch) {
        console.error("Skipping Ticket Test: No user/branch found.");
    } else {
        if (!customer) {
            customer = await db.customer.create({
                data: {
                    name: "Temp Customer",
                    phone: "0000000000",
                    branchId: branch.id,
                    userId: user.id
                }
            });
        }

        await db.repair.create({
            data: {
                ticketNumber: testTicket,
                branchId: branch.id,
                customerId: customer.id,
                userId: user.id,
                statusId: 1,
                deviceBrand: "Test",
                deviceModel: "Test",
                problemDescription: "Test",
                promisedAt: new Date()
            }
        });

        const check2 = await ticketService.validateTicketUnique(testTicket, branch.id);
        console.log(`Check after create: ${check2} (Expected: false)`);

        if (check1 === true && check2 === false) {
            console.log("✅ Ticket Service Test PASSED");
        } else {
            console.error("❌ Ticket Service Test FAILED");
        }

        // Cleanup
        await db.repair.deleteMany({ where: { ticketNumber: testTicket } });
    }


    // 3. Customer Service Test
    console.log("\n👤 Testing Customer Service...");
    const phone = "9999999999";
    const user2 = await db.user.findFirst();
    const branch2 = await db.branch.findFirst();

    if (user2 && branch2) {
        // Cleanup
        await db.customer.deleteMany({ where: { phone } });

        // Create
        const c1 = await customerService.findOrCreate({
            name: "Juan Test",
            phone,
            branchId: branch2.id,
            userId: user2.id,
            email: "juan@test.com"
        });
        console.log(`Created: ${c1.name} (${c1.email})`);

        // Update
        const c2 = await customerService.findOrCreate({
            name: "Juan Test Updated",
            phone,
            branchId: branch2.id,
            userId: user2.id,
            email: "juan@test.com"
        });
        console.log(`Updated: ${c2.name}`);

        if (c1.id === c2.id && c2.name === "Juan Test Updated") {
            console.log("✅ Customer Service Test PASSED");
        } else {
            console.error("❌ Customer Service Test FAILED");
        }

        // Cleanup
        await db.customer.deleteMany({ where: { phone } });
    }

    console.log("\n🏁 Tests Completed.");
}

main();
