
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ticket = "mc2-00000069";
    console.log(`Searching for ticket: ${ticket}`);

    const repair = await prisma.repair.findFirst({
        where: { ticketNumber: ticket },
        select: {
            id: true,
            ticketNumber: true,
            statusId: true,
            currentStatus: { select: { name: true } }, // Assuming relation matches schema
            startedAt: true,
            estimatedTime: true,
            updatedAt: true
        }
    });

    if (!repair) {
        console.log("Repair not found");
        // Try searching for partial match just in case prefix differs
        const repairPartial = await prisma.repair.findFirst({
            where: { ticketNumber: { contains: "00000069" } }
        });
        if (repairPartial) console.log("Found partial match:", repairPartial);
    } else {
        console.log("Repair Found:", JSON.stringify(repair, null, 2));
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
