"use server";

import { db as prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(email: string, password: string) {
    console.log("LOGIN ACTION STARTED", { email });
    try {
        console.log("db.user.findUnique calling...");
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            include: { branch: true },
        });
        console.log("db.user.findUnique result:", user ? "User found" : "User not found");

        if (!user) {
            return { success: false, error: "Credenciales inválidas" };
        }

        console.log("bcrypt.compare calling...");
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log("bcrypt.compare result:", passwordMatch);

        if (!passwordMatch) {
            return { success: false, error: "Credenciales inválidas" };
        }

        // Update user status to ONLINE
        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true, lastActiveAt: new Date() }
        });

        console.log("cookies() calling...");
        // Set session cookie (expires in 4 hours)
        const cookieStore = await cookies();
        const FOUR_HOURS = 4 * 60 * 60;

        console.log("cookies() acquired, setting session...");
        cookieStore.set("session_user_id", user.id, {
            httpOnly: true,
            secure: false, // process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: FOUR_HOURS,
        });

        cookieStore.set("session_role", user.role, {
            httpOnly: true,
            secure: false, // process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: FOUR_HOURS,
        });

        // Redirect based on role (STANDARD UNIFORM: All roles go to /dashboard)
        let redirectPath: string;
        switch (user.role) {
            case "ADMIN":
                redirectPath = "/admin/dashboard";
                break;
            case "VENDOR":
                redirectPath = "/vendor/dashboard";
                break;
            case "TECHNICIAN":
                redirectPath = "/technician/dashboard";
                break;
            default:
                return { success: false, error: "Rol no reconocido" };
        }

        console.log("Login success, redirecting to:", redirectPath);
        return { success: true, redirectPath };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Error del servidor" };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    if (userId) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { isOnline: false }
            });
        } catch (error) {
            console.error("Error upgrading user status on logout:", error);
        }
    }

    cookieStore.delete("session_user_id");
    cookieStore.delete("session_role");
    // Don't redirect here - let the client component handle it
}

export async function getCurrentUser() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_user_id")?.value;

        if (!userId) {
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                imageUrl: true, // Add this
                createdAt: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        ticketPrefix: true,
                        address: true,
                        phone: true,
                        imageUrl: true,
                    },
                },
            },
        });

        return user;
    } catch (error) {
        console.error("Get current user error:", error);
        return null;
    }
}
