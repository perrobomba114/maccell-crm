
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function debug() {
    try {
        const connectionString = process.env.DATABASE_URL;
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        console.log("--- Fetching Status Map ---");
        const statuses = await prisma.repairStatus.findMany();
        const statusMap = {};
        statuses.forEach(s => statusMap[s.id] = s.name);
        console.log(statusMap);

        console.log("\n--- Searching for Alejandro Alfonso ---");
        const user = await prisma.user.findFirst({
            where: { name: { contains: 'Alejandro', mode: 'insensitive' } }
        });

        if (!user) {
            console.log("User not found.");
            return;
        }

        console.log(`User: ${user.name} (ID: ${user.id})`);

        console.log("\n--- Recent Repairs (Last 10) ---");
        const repairs = await prisma.repair.findMany({
            where: { assignedUserId: user.id },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                ticketNumber: true,
                statusId: true,
                updatedAt: true,
                branchId: true,
                estimatedTime: true // Added
            }
        });

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dashboardStatuses = [5, 6, 7, 10];

        console.log(`Current Dashboard Criteria: Date >= ${firstDayOfMonth.toISOString()} AND Status IN [${dashboardStatuses.join(',')}]`);

        repairs.forEach(r => {
            const statusName = statusMap[r.statusId] || "Unknown";
            const isDateValid = r.updatedAt >= firstDayOfMonth;
            const isStatusValid = dashboardStatuses.includes(r.statusId);
            const willCount = isDateValid && isStatusValid;

            console.log(`[${r.ticketNumber}] Status: ${r.statusId} (${statusName}) | Time: ${r.estimatedTime}m | Updated: ${r.updatedAt.toISOString()} | Will Count? ${willCount ? "YES" : "NO"}`);
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
