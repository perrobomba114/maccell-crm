"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function uploadBranchImage(base64Data: string, fileName: string) {
    try {
        // Remove data URL prefix if present
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Image, "base64");

        // Create branches directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "branches");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = fileName.split(".").pop();
        const uniqueFileName = `branch-${timestamp}.${extension}`;

        // Save file
        const filePath = join(uploadDir, uniqueFileName);
        await writeFile(filePath, buffer);

        // Return relative path for database storage
        const relativePath = `/branches/${uniqueFileName}`;

        return { success: true, imageUrl: relativePath };
    } catch (error) {
        console.error("Upload image error:", error);
        return { success: false, error: "Error al subir la imagen" };
    }
}

export async function uploadProfileImage(base64Data: string, fileName: string) {
    try {
        // Remove data URL prefix if present
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Image, "base64");

        // Create profiles directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "profiles");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = fileName.split(".").pop();
        const uniqueFileName = `profile-${timestamp}.${extension}`;

        // Save file
        const filePath = join(uploadDir, uniqueFileName);
        await writeFile(filePath, buffer);

        // Return relative path for database storage
        const relativePath = `/profiles/${uniqueFileName}`;

        return { success: true, imageUrl: relativePath };
    } catch (error) {
        console.error("Upload user image error:", error);
        return { success: false, error: "Error al subir la imagen" };
    }
}

export async function uploadKnowledgeMedia(base64Data: string, fileName: string) {
    try {
        const base64Content = base64Data.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Content, "base64");

        const uploadDir = join(process.cwd(), "public", "knowledge");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const extension = fileName.split(".").pop();
        const safeOriginalName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(`.${extension}`, "");
        const uniqueFileName = `${safeOriginalName}-${timestamp}.${extension}`;

        const filePath = join(uploadDir, uniqueFileName);
        await writeFile(filePath, buffer);

        const relativePath = `/knowledge/${uniqueFileName}`;
        return { success: true, url: relativePath };
    } catch (error) {
        console.error("Upload knowledge media error:", error);
        return { success: false, error: "Error al subir el archivo" };
    }
}
