import { cookies } from "next/headers";
import { VendorLayoutClient } from "./vendor-layout-client";
import { vendorGroups, technicianGroups } from "@/components/layout/nav-config";

export default async function VendorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const sessionRole = cookieStore.get("session_role")?.value;

    // Determine which groups to show based on role
    // If TECHNICIAN is accessing a vendor route, show technician groups
    const groups = sessionRole === "TECHNICIAN" ? technicianGroups : vendorGroups;

    return (
        <VendorLayoutClient groups={groups}>
            {children}
        </VendorLayoutClient>
    );
}
