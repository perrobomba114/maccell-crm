"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const ALLOWED_MEDIA_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateExtension(fileName: string, allowed: string[]): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
        throw new Error(`Tipo de archivo no permitido. Permitidos: ${allowed.join(", ")}`);
    }
    return ext;
}

function validateSize(buffer: Buffer) {
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error("El archivo supera el límite de 10 MB");
    }
}

export async function uploadBranchImage(base64Data: string, fileName: string) {
    try {
        const extension = validateExtension(fileName, ALLOWED_IMAGE_EXTENSIONS);
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Image, "base64");
        validateSize(buffer);

        const uploadDir = join(process.cwd(), "public", "branches");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const uniqueFileName = `branch-${Date.now()}.${extension}`;
        await writeFile(join(uploadDir, uniqueFileName), buffer);

        return { success: true, imageUrl: `/branches/${uniqueFileName}` };
    } catch (error: any) {
        console.error("Upload image error:", error);
        return { success: false, error: error.message || "Error al subir la imagen" };
    }
}

export async function uploadProfileImage(base64Data: string, fileName: string) {
    try {
        const extension = validateExtension(fileName, ALLOWED_IMAGE_EXTENSIONS);
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Image, "base64");
        validateSize(buffer);

        const uploadDir = join(process.cwd(), "public", "profiles");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const uniqueFileName = `profile-${Date.now()}.${extension}`;
        await writeFile(join(uploadDir, uniqueFileName), buffer);

        return { success: true, imageUrl: `/profiles/${uniqueFileName}` };
    } catch (error: any) {
        console.error("Upload user image error:", error);
        return { success: false, error: error.message || "Error al subir la imagen" };
    }
}

export async function uploadKnowledgeMedia(base64Data: string, fileName: string) {
    try {
        const extension = validateExtension(fileName, ALLOWED_MEDIA_EXTENSIONS);
        const base64Content = base64Data.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Content, "base64");
        validateSize(buffer);

        const uploadDir = join(process.cwd(), "public", "knowledge");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const safeOriginalName = fileName
            .replace(/\.[^.]+$/, "")
            .replace(/[^a-zA-Z0-9-]/g, "_")
            .substring(0, 60);
        const uniqueFileName = `${safeOriginalName}-${Date.now()}.${extension}`;

        await writeFile(join(uploadDir, uniqueFileName), buffer);

        return { success: true, url: `/knowledge/${uniqueFileName}` };
    } catch (error: any) {
        console.error("Upload knowledge media error:", error);
        return { success: false, error: error.message || "Error al subir el archivo" };
    }
}
