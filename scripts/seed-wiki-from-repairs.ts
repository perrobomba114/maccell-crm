import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Iniciando sincronización de Wiki desde Reparaciones...");

    // Obtener todas las reparaciones que tengan diagnóstico y estén finalizadas (o tengan info útil)
    const repairs = await prisma.repair.findMany({
        where: {
            diagnosis: { not: null },
            OR: [
                { statusId: 5 },  // Finalizado OK
                { statusId: 7 },  // Diagnosticado
                { statusId: 10 }, // Entregado (La gran mayoría)
                { statusId: 6 }   // No Reparado (Info técnica de por qué falló)
            ]
        },
        include: {
            createdBy: true,
            status: true
        }
    });

    console.log(`📊 Se encontraron ${repairs.length} reparaciones con información técnica.`);

    let createdCount = 0;
    for (const repair of repairs) {
        // Evitaremos duplicados básicos por título (Modelo + Diagnóstico corto)
        const title = `${repair.deviceBrand} ${repair.deviceModel}: ${repair.diagnosis?.substring(0, 50)}...`;

        // Verificar si ya existe en la Wiki (RepairKnowledge)
        const existing = await (prisma as any).repairKnowledge.findFirst({
            where: {
                title: title
            }
        });

        if (!existing) {
            await (prisma as any).repairKnowledge.create({
                data: {
                    deviceBrand: repair.deviceBrand,
                    deviceModel: repair.deviceModel,
                    title: title,
                    content: `Diagnóstico Original: ${repair.diagnosis}\n\nFalla reportada: ${repair.problemDescription}\n\nEstado final: ${repair.status.name}`,
                    authorId: repair.userId,
                    problemTags: [repair.deviceBrand, "Importado", "Reparación"],
                }
            });
            createdCount++;
        }
    }

    console.log(`✅ Sincronización finalizada. Se crearon ${createdCount} nuevas entradas en la Wiki.`);
}

main()
    .catch((e) => {
        console.error("❌ Error en la sincronización:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
