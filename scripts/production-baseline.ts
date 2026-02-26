import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando línea base de historial de estados ---');

    const repairs = await prisma.repair.findMany({
        include: {
            statusHistory: true,
        },
    });

    console.log(`Encontradas ${repairs.length} reparaciones.`);

    let createdCount = 0;
    for (const repair of repairs) {
        if (repair.statusHistory.length === 0) {
            await prisma.repairStatusHistory.create({
                data: {
                    repairId: repair.id,
                    toStatusId: repair.statusId,
                    // No conocemos el anterior, así que marcamos el actual como punto de partida
                    createdAt: repair.updatedAt,
                },
            });
            createdCount++;
        }
    }

    console.log(`Se crearon ${createdCount} registros de historial inicial.`);
    console.log('--- Proceso completado ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
