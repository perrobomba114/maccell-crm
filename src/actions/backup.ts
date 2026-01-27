"use server";

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import os from "os";

const execAsync = util.promisify(exec);

// Temporary directory for processing
const TEMP_DIR = os.tmpdir();

export type BackupFile = {
    id: string; // Changed from just name to include ID
    name: string;
    size: number;
    createdAt: Date;
};

export async function listBackups(): Promise<{ success: boolean; backups?: BackupFile[]; error?: string }> {
    try {
        const backups = await (db as any).backup.findMany({
            select: {
                id: true,
                name: true,
                size: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { success: true, backups };
    } catch (error) {
        console.error("List backups error:", error);
        return { success: false, error: "Error al listar backups: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function createBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `backup_${timestamp}.sql`;
        const filepath = path.join(TEMP_DIR, filename);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL no definida");

        const url = new URL(dbUrl);
        url.search = "";
        const cleanDbUrl = url.toString();

        // 1. Create Dump to Temp File
        const command = `pg_dump "${cleanDbUrl}" --clean --if-exists --no-owner --no-acl -f "${filepath}"`;
        await execAsync(command);

        // 2. Read file to buffer
        const fileBuffer = fs.readFileSync(filepath);
        const stats = fs.statSync(filepath);

        // 3. Save to DB
        await (db as any).backup.create({
            data: {
                name: filename,
                size: stats.size,
                content: fileBuffer
            }
        });

        // 4. Cleanup Temp File
        fs.unlinkSync(filepath);

        revalidatePath("/admin/backups");
        return { success: true, filename };
    } catch (error) {
        console.error("Create backup error:", error);
        return { success: false, error: "Error al crear backup: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Find by name since UI sends filename currently (or id if we updated it)
        // Let's support both if possible or stick to name as unique
        const backup = await (db as any).backup.findUnique({
            where: { name: filename }
        });

        if (!backup) {
            throw new Error("Archivo de backup no encontrado en base de datos");
        }

        const filepath = path.join(TEMP_DIR, backup.name);

        // 1. Write Buffer to Temp File
        fs.writeFileSync(filepath, backup.content);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL no definida");

        const url = new URL(dbUrl);
        url.search = "";
        const cleanDbUrl = url.toString();

        // 2. Restore from Temp File
        const command = `psql "${cleanDbUrl}" < "${filepath}"`;
        await execAsync(command);

        // 3. Cleanup
        fs.unlinkSync(filepath);

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Restore backup error:", error);
        return { success: false, error: "Error crítico al restaurar: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
        await (db as any).backup.delete({
            where: { name: filename }
        });

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Delete backup error:", error);
        return { success: false, error: "Error al eliminar backup" };
    }
}

export async function uploadBackup(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No se recibió ningún archivo");

        if (!file.name.endsWith(".sql")) {
            throw new Error("El archivo debe ser .sql");
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        await (db as any).backup.create({
            data: {
                name: file.name,
                size: file.size,
                content: buffer
            }
        });

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Upload backup error:", error);
        return { success: false, error: "Error al subir backup" };
    }
}

