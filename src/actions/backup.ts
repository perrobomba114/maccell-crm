"use server";

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { revalidatePath } from "next/cache";

const execAsync = util.promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        try {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        } catch (e) {
            console.error("Failed to create backup directory:", e);
            throw new Error("No se pudo crear el directorio de backups. Verifique permisos.");
        }
    }
}

export type BackupFile = {
    name: string;
    size: number;
    createdAt: Date;
};

export async function listBackups(): Promise<{ success: boolean; backups?: BackupFile[]; error?: string }> {
    try {
        ensureBackupDir();

        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".sql"));
        const backups = files.map(file => {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            return {
                name: file,
                size: stats.size,
                createdAt: stats.birthtime
            };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return { success: true, backups };
    } catch (error) {
        console.error("List backups error:", error);
        return { success: false, error: "Error al listar backups: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function createBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
        ensureBackupDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `backup_${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL no definida");

        // Clean query params (like ?schema=public) which native tools might reject
        const url = new URL(dbUrl);
        url.search = "";
        const cleanDbUrl = url.toString();

        // pg_dump command
        const command = `pg_dump "${cleanDbUrl}" --clean --if-exists --no-owner --no-acl -f "${filepath}"`;

        await execAsync(command);

        revalidatePath("/admin/backups");
        return { success: true, filename };
    } catch (error) {
        console.error("Create backup error:", error);
        return { success: false, error: "Error al crear backup: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
        const filepath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filepath)) {
            throw new Error("Archivo de backup no encontrado");
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL no definida");

        const url = new URL(dbUrl);
        url.search = "";
        const cleanDbUrl = url.toString();

        const command = `psql "${cleanDbUrl}" < "${filepath}"`;

        await execAsync(command);

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Restore backup error:", error);
        return { success: false, error: "Error crítico al restaurar: " + (error instanceof Error ? error.message : "Desconocido") };
    }
}

export async function deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
        const filepath = path.join(BACKUP_DIR, filename);

        if (!filepath.startsWith(BACKUP_DIR)) {
            throw new Error("Ruta inválida");
        }

        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Delete backup error:", error);
        return { success: false, error: "Error al eliminar backup" };
    }
}

export async function uploadBackup(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        ensureBackupDir();
        const file = formData.get("file") as File;
        if (!file) throw new Error("No se recibió ningún archivo");

        if (!file.name.endsWith(".sql")) {
            throw new Error("El archivo debe ser .sql");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filepath = path.join(BACKUP_DIR, file.name);

        fs.writeFileSync(filepath, buffer);

        revalidatePath("/admin/backups");
        return { success: true };
    } catch (error) {
        console.error("Upload backup error:", error);
        return { success: false, error: "Error al subir backup" };
    }
}
