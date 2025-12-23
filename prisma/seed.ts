import { PrismaClient, Role, CategoryType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Prisma 7 requires an adapter for database connections
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Starting database seeding...");

    // Clean existing data
    console.log("🧹 Cleaning existing data...");
    // Reverse dependency order
    await prisma.repairPart.deleteMany();
    await prisma.repairObservation.deleteMany();
    await prisma.repair.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.repairStatus.deleteMany();

    await prisma.sale.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.productStock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sparePart.deleteMany();
    await prisma.category.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();

    // ==================== BRANCHES ====================
    console.log("🏢 Creating branches...");

    await prisma.branch.createMany({
        data: [
            {
                id: "cmj0eutuw0000touvx2hom5fb",
                name: "MACCELL 1",
                address: "Rivadavia 968",
                code: "MAC1",
                ticketPrefix: "MAC1",
                phone: "2664838382",
                imageUrl: "/branches/branch-1765396356115.jpg",
                createdAt: new Date("2025-12-10T19:37:07.496Z"),
                updatedAt: new Date("2025-12-10T19:52:36.148Z")
            },
            {
                id: "cmj0cgvkr0000fluvglfruv3d",
                name: "MACCELL 2",
                address: "Rivadavia 598",
                code: "MAC2",
                ticketPrefix: "MAC2",
                phone: "2664838382",
                imageUrl: "/branches/branch-1765396373800.jpg",
                createdAt: new Date("2025-12-10T18:30:17.307Z"),
                updatedAt: new Date("2025-12-10T19:52:53.833Z")
            },
            {
                id: "cmj0ew1480001touvyujk8jy5",
                name: "MACCELL 3",
                address: "Rivadavia 638",
                code: "MAC3",
                ticketPrefix: "MAC3",
                phone: "2664838382",
                imageUrl: "/branches/branch-1765396389150.jpg",
                createdAt: new Date("2025-12-10T19:38:03.560Z"),
                updatedAt: new Date("2025-12-10T19:53:09.183Z")
            },
            {
                id: "cmj0ewq7l0002touv96f57pdc",
                name: "8 BIT ACCESORIOS",
                address: "Rivadavia 656",
                code: "8BIT",
                ticketPrefix: "8BIT",
                phone: "2665060689",
                imageUrl: "/branches/branch-1765396753667.png",
                createdAt: new Date("2025-12-10T19:38:36.081Z"),
                updatedAt: new Date("2025-12-10T21:41:13.698Z")
            }
        ]
    });

    // ==================== USERS ====================
    console.log("👥 Creating users...");

    await prisma.user.createMany({
        data: [
            {
                id: "cmj0hstz30001ysuvs8tt3v5g",
                email: "jorge@maccell.com.ar",
                password: "$2b$10$6834tgmd8/sdsyC0sqyR5uktQNBRZi7hg7BESEostoQo8Foi0LtsW",
                name: "Jorge Sheppard",
                role: Role.TECHNICIAN,
                branchId: null,
                createdAt: new Date("2025-12-10T20:59:33.181Z"),
                updatedAt: new Date("2025-12-10T21:39:11.218Z")
            },
            {
                id: "cmj0cgvmn0003fluvwuyzwp08",
                email: "naim@maccell.com.ar",
                password: "$2b$10$FJ38iEtorddHxNI/xNg2neEigdC6Z1sau1RgMR05Y2xlLMAvg4Px6",
                name: "Naim Berrios",
                role: Role.VENDOR,
                branchId: "cmj0eutuw0000touvx2hom5fb",
                createdAt: new Date("2025-12-10T18:30:17.375Z"),
                updatedAt: new Date("2025-12-10T21:41:54.519Z")
            },
            {
                id: "cmj0jbz370000qeuvkbf54j6d",
                email: "ivan@maccell.com.ar",
                password: "$2b$10$PnWOxOSw5s7gtIVoquNN/uhrGcMwjwPIa8H0J6AVFb.cN2xx7KhUC",
                name: "Ivan Gomez",
                role: Role.VENDOR,
                branchId: "cmj0cgvkr0000fluvglfruv3d",
                createdAt: new Date("2025-12-10T21:42:25.889Z"),
                updatedAt: new Date("2025-12-10T21:42:25.889Z")
            },
            {
                id: "cmj0jclof0001qeuv107t9loh",
                email: "misael@maccell.com.ar",
                password: "$2b$10$ELejzMJ/5J2XyBd88WBbgOaEArkuIrBi9mH2glgkhTNAE632ANZ8u",
                name: "Misael Lucero",
                role: Role.VENDOR,
                branchId: "cmj0ew1480001touvyujk8jy5",
                createdAt: new Date("2025-12-10T21:42:55.165Z"),
                updatedAt: new Date("2025-12-10T21:42:55.165Z")
            },
            {
                id: "cmj0jdhj70002qeuvkcpktgel",
                email: "lautaro@maccell.com.ar",
                password: "$2b$10$8WNsTgG/IV21XJW2Q3dQC.WIAHTQ4QS2HqD405qxXCCNPm7bv.Cmu",
                name: "Lautaro Romero",
                role: Role.VENDOR,
                branchId: "cmj0ewq7l0002touv96f57pdc",
                createdAt: new Date("2025-12-10T21:43:36.449Z"),
                updatedAt: new Date("2025-12-10T21:43:36.449Z")
            },
            {
                id: "cmj0je52x0003qeuvxycmxun8",
                email: "david@maccell.com.ar",
                password: "$2b$10$8t1HT95mx5rgf9TD2PdSNu2v5VHRn5Svx.WeadNJHy/XgLWA7f0ca",
                name: "David Sanchez",
                role: Role.ADMIN,
                branchId: null,
                createdAt: new Date("2025-12-10T21:44:06.967Z"),
                updatedAt: new Date("2025-12-10T21:44:06.967Z")
            }
        ]
    });

    // ==================== REPAIR STATUSES ====================
    console.log("🚦 Creating repair statuses...");
    await prisma.repairStatus.createMany({
        data: [
            { id: 1, name: "Para Retirar/Ingresado", color: "blue" },
            { id: 2, name: "Tomado por Técnico", color: "indigo" },
            { id: 3, name: "En Proceso", color: "yellow" },
            { id: 4, name: "Pausado", color: "gray" },
            { id: 5, name: "Finalizado OK", color: "green" },
            { id: 6, name: "No Reparado", color: "red" },
            { id: 7, name: "Diagnosticado", color: "purple" },
            { id: 8, name: "Esperando Confirmación", color: "orange" },
            { id: 9, name: "Esperando Repuestos", color: "amber" },
            { id: 10, name: "Entregado", color: "slate" },
        ]
    });

    // ==================== CATEGORIES & SPARE PARTS ====================
    console.log("🛠️ Creating categories and spare parts...");
    const categoryPart = await prisma.category.create({
        data: {
            name: "Repuestos Generales",
            type: CategoryType.PART,
            description: "Repuestos para reparaciones"
        }
    });

    await prisma.sparePart.createMany({
        data: [
            {
                name: "Pantalla Samsung S23",
                sku: "SP-S23-SCREEN",
                brand: "Samsung",
                categoryId: categoryPart.id,
                stockLocal: 10,
                priceUsd: 150,
                priceArg: 150000
            },
            {
                name: "Batería iPhone 13",
                sku: "SP-IP13-BAT",
                brand: "Apple",
                categoryId: categoryPart.id,
                stockLocal: 20,
                priceUsd: 80,
                priceArg: 80000
            },
            {
                name: "Pin de Carga USB-C",
                sku: "SP-GEN-USBC",
                brand: "Genérico",
                categoryId: categoryPart.id,
                stockLocal: 50,
                priceUsd: 5,
                priceArg: 5000
            }
        ]
    });

    console.log("\n🎉 Database seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Error during seeding:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
