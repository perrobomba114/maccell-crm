
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
    const categoryName = "Repuestos Generales";
    console.log(`Searching for category: ${categoryName}`);

    const category = await prisma.category.findFirst({
        where: { name: { equals: categoryName, mode: 'insensitive' } }
    });

    if (!category) {
        console.log("Category not found.");
        return;
    }

    console.log(`Found Category: ${category.id} - ${category.name}`);

    // Find all parts in this category (including Soft Deleted)
    const parts = await prisma.sparePart.findMany({
        where: { categoryId: category.id },
        include: { _count: { select: { repairParts: true } } }
    });

    console.log(`Found ${parts.length} parts in this category.`);

    let reassigned = 0;
    let deleted = 0;

    // Create or Find "Archivado" category if we need to reassign
    let archiveCategory = await prisma.category.findFirst({
        where: { name: "Archivado" }
    });

    for (const part of parts) {
        const isUsed = part._count.repairParts > 0;

        if (isUsed) {
            // Move to Archive
            if (!archiveCategory) {
                console.log("Creating 'Archivado' category...");
                archiveCategory = await prisma.category.create({
                    data: { name: "Archivado", type: "PART", description: "Repuestos antiguos o eliminados" }
                });
            }
            console.log(`[USED] Relocating SKU ${part.sku} to 'Archivado'...`);
            await prisma.sparePart.update({
                where: { id: part.id },
                data: { categoryId: archiveCategory.id }
            });
            reassigned++;
        } else {
            // Hard Delete
            console.log(`[UNUSED] Hard Deleting SKU ${part.sku}...`);
            try {
                await prisma.sparePart.delete({
                    where: { id: part.id }
                });
                deleted++;
            } catch (e) {
                console.error(`Failed to delete ${part.sku}:`, e);
            }
        }
    }

    console.log(`Summary: ${deleted} deleted, ${reassigned} reassigned.`);

    // Now delete the category
    console.log("Deleting Category...");
    try {
        await prisma.category.delete({
            where: { id: category.id }
        });
        console.log("Category deleted successfully.");
    } catch (e) {
        console.error("Failed to delete category:", e);
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
