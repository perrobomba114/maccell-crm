"use server";

import { getCurrentUser as getUser } from "@/actions/auth-actions";

export async function getUserData() {
    return await getUser();
}
