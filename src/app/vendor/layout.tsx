import { cookies } from "next/headers";
import { VendorLayoutClient } from "./vendor-layout-client";
import { vendorLinks, technicianLinks } from "@/components/layout/nav-config";

export default async function VendorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const sessionRole = cookieStore.get("session_role")?.value;

    // Determine which links to show based on role
    // If TECHNICIAN is accessing a vendor route (like stock), show technician links
    const links = sessionRole === "TECHNICIAN" ? technicianLinks : vendorLinks;

    return (
        <VendorLayoutClient links={links}>
            {children}
        </VendorLayoutClient>
    );
}
