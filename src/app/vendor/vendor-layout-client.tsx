"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { getUserData } from "@/actions/get-user";
import { PresenceHeartbeat } from "@/components/shared/presence-heartbeat";
import { getTechniciansWorkload } from "@/actions/dashboard-actions";
import { cn } from "@/lib/utils";

interface LinkItem {
    href: string;
    label: string;
    icon: string;
}

interface SidebarGroup {
    label?: string;
    items: LinkItem[];
}

interface VendorLayoutClientProps {
    children: React.ReactNode;
    groups: SidebarGroup[];
}

type TechnicianWorkload = Awaited<ReturnType<typeof getTechniciansWorkload>>;

export function VendorLayoutClient({
    children,
    groups,
}: VendorLayoutClientProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userName, setUserName] = useState<string | undefined>("Usuario");
    const [userEmail, setUserEmail] = useState<string | undefined>("");
    const [userImage, setUserImage] = useState<string | null | undefined>(null);
    const [userId, setUserId] = useState<string | undefined>("");
    const pathname = usePathname();

    const [techniciansWorkload, setTechniciansWorkload] = useState<TechnicianWorkload>([]);
    const isPosRoute = pathname === "/vendor/pos";

    const fetchData = async () => {
        const user = await getUserData();
        if (user) {
            setUserName(user.name);
            setUserEmail(user.email);
            setUserImage(user.imageUrl);
            setUserId(user.id);
        }
    };

    useEffect(() => {
        const handleUserUpdate = () => {
            void fetchData();
        };

        window.addEventListener("user-data-updated", handleUserUpdate);
        return () => window.removeEventListener("user-data-updated", handleUserUpdate);
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const initializeData = async () => {
            const user = await getUserData();
            if (user) {
                setUserName(user.name);
                setUserEmail(user.email);
                setUserImage(user.imageUrl);
                setUserId(user.id);

                // Fetch technicians workload
                // Initial fetch (Global - No branch filter - or filter by user branch if implemented)
                // Assuming vendors are viewing GLOBAL technicians for now as per "Time Global" context
                const workload = await getTechniciansWorkload(user.branch?.id);
                setTechniciansWorkload(workload);

                // Poll every 30 seconds
                intervalId = setInterval(async () => {
                    const updatedWorkload = await getTechniciansWorkload(user.branch?.id);
                    setTechniciansWorkload(updatedWorkload);
                }, 30000);
            }
        };

        initializeData();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className={cn("flex min-h-screen", isPosRoute && "h-dvh overflow-hidden")} suppressHydrationWarning>
            <PresenceHeartbeat />
            <Sidebar
                groups={groups}
                onCollapseChange={setIsCollapsed}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <motion.div
                animate={{
                    paddingLeft: isMobile ? "0px" : (isCollapsed ? "4.5rem" : "17rem"),
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className={cn("min-w-0 flex-1", isPosRoute && "h-dvh overflow-hidden")}
            >
                <Header
                    title=""
                    userName={userName}
                    userEmail={userEmail}
                    userImage={userImage}
                    userId={userId}
                    techniciansWorkload={techniciansWorkload}
                    profileHref="/vendor/profile"
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <div
                    className={cn(
                        "p-6 pt-[5.5rem] md:pt-6",
                        isPosRoute && "h-[calc(100dvh-4rem)] overflow-hidden p-3 pt-[5.5rem] md:p-4 md:pt-4"
                    )}
                >
                    {children}
                </div>
            </motion.div>
        </div>
    );
}
