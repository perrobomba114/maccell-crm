"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { getUserData } from "@/actions/get-user";

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

    const [techniciansWorkload, setTechniciansWorkload] = useState<any[]>([]);

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
            console.log("User data update detected, refetching...");
            fetchData();
        };

        window.addEventListener('user-data-updated' as any, handleUserUpdate);
        return () => window.removeEventListener('user-data-updated' as any, handleUserUpdate);
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
                const { getTechniciansWorkload } = await import("@/actions/dashboard-actions");

                // Initial fetch (Global - No branch filter - or filter by user branch if implemented)
                // Assuming vendors are viewing GLOBAL technicians for now as per "Time Global" context
                const workload = await getTechniciansWorkload(user.branch?.id);
                setTechniciansWorkload(workload);

                // Poll every 10 seconds
                intervalId = setInterval(async () => {
                    const updatedWorkload = await getTechniciansWorkload(user.branch?.id);
                    setTechniciansWorkload(updatedWorkload);
                }, 10000);
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
        <div className="flex min-h-screen" suppressHydrationWarning>
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
                className="flex-1"
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
                <AnimatePresence mode="wait">
                    <motion.main
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                        className="p-6 pt-[5.5rem] md:pt-6"
                    >
                        {children}
                    </motion.main>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
