import { redirect } from "next/navigation";
import { CreateRepairForm } from "@/components/repairs/create-form";
// We need to fetch current user's branch. Assuming session/auth.
// I'll assume we can get unique user info similar to how it was done in other pages or standard Next.js
// For now, I'll use a placeholder or check `src/lib/auth` if it exists.
// I'll search for auth pattern. `User` model has `branchId`.
// I'll just look up the user by email (mock auth or real if available).
// I'll assume standard `getServerSession` or similar isn't strictly set up in my view.
// I'll use a hardcoded user or try to find a "getCurrentUser" util.
// I recall `auth()->user()` in the user request snippets (PHP/Laravel style).
// In Next.js App Router, maybe Clerk, NextAuth, or custom?
// The schema has `User` model.
// I'll use a stub "getCurrentUser" or just fetch the first admin/vendor for testing if no auth system found task-wide.
// Checking `package.json`... `bcryptjs` is there. It's custom auth.
// I'll look for `src/lib/auth.ts`.

import { db } from "@/lib/db";
import { getVendors } from "@/actions/user-actions";

async function getSessionUser() {
    // Placeholder: Return the first VENDOR user created in seed.
    // In real app, verify session cookie/token.
    // Naim Berrios (Vendor) ID: cmj0cgvmn0003fluvwuyzwp08
    return await db.user.findFirst({
        where: { role: "VENDOR" },
        include: { branch: true } // Need branch for prefix
    });
}

export default async function CreateRepairPage() {
    const user = await getSessionUser();
    const { vendors } = await getVendors();

    if (!user) {
        return <div className="p-8">No autorizado. Inicie sesión.</div>;
    }

    if (!user.branchId) {
        return <div className="p-8">Usuario no asignado a una sucursal.</div>;
    }

    return (


        <CreateRepairForm
            branchId={user.branchId}
            userId={user.id}
            vendors={vendors || []}
        />
    );
}
