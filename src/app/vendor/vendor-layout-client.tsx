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

interface VendorLayoutClientProps {
    children: React.ReactNode;
    links: LinkItem[];
}

export function VendorLayoutClient({
    children,
    links,
}: VendorLayoutClientProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userName, setUserName] = useState<string | undefined>("Usuario");
    const [userEmail, setUserEmail] = useState<string | undefined>("");
    const [userId, setUserId] = useState<string | undefined>("");
    const pathname = usePathname();

    const [techniciansWorkload, setTechniciansWorkload] = useState<any[]>([]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const fetchData = async () => {
            const user = await getUserData();
            if (user) {
                setUserName(user.name);
                setUserEmail(user.email);
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

        fetchData();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return (
        <div className="flex min-h-screen" suppressHydrationWarning>
            <Sidebar links={links} onCollapseChange={setIsCollapsed} />
            <motion.div
                animate={{
                    paddingLeft: isCollapsed ? "4rem" : "16rem", // 64px : 256px
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className="flex-1"
            >
                <Header
                    title="Panel de Ventas"
                    userName={userName}
                    userEmail={userEmail}
                    userId={userId}
                    techniciansWorkload={techniciansWorkload}
                    profileHref="/vendor/profile"
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
                        className="p-6"
                    >
                        {children}
                    </motion.main>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
