
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
    console.log("Analyzing Repair Counts...");

    const [totalRepairs, repairsByStatus, repairsByBranch] = await Promise.all([
        prisma.repair.count(),
        prisma.repair.groupBy({
            by: ['statusId'],
            _count: { _all: true },
            orderBy: { statusId: 'asc' }
        }),
        prisma.branch.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        repairs: true
                    }
                }
            }
        })
    ]);

    const statuses = await prisma.repairStatus.findMany();

    console.log(`\nTotal Repairs in Database: ${totalRepairs}`);

    console.log("\nCounts by Status:");
    console.log("ID | Name                     | Count");
    console.log("---|--------------------------|-------");
    let activeTotal = 0;
    repairsByStatus.forEach(s => {
        const name = statuses.find(st => st.id === s.statusId)?.name || `Status ${s.statusId}`;
        console.log(`${s.statusId.toString().padEnd(2)} | ${name.padEnd(24)} | ${s._count._all}`);
        if (s.statusId !== 10) {
            activeTotal += s._count._all;
        }
    });

    console.log(`\nActive Repairs (Status != 10): ${activeTotal}`);
    console.log(`Delivered Repairs (Status == 10): ${totalRepairs - activeTotal}`);

    console.log("\nCounts by Branch:");
    console.log("Branch Name                | Total Repairs | Active (not 10)");
    console.log("---------------------------|---------------|----------------");
    for (const b of repairsByBranch) {
        const activeCount = await prisma.repair.count({
            where: { branchId: b.id, statusId: { not: 10 } }
        });
        console.log(`${b.name.padEnd(26)} | ${b._count.repairs.toString().padEnd(13)} | ${activeCount}`);
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
