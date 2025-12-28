"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { getUserData } from "@/actions/get-user";

import { adminGroups } from "@/components/layout/nav-config";
import { getTechniciansWorkload } from "@/actions/dashboard-actions";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userName, setUserName] = useState<string | undefined>("Usuario");
    const [userEmail, setUserEmail] = useState<string | undefined>("");
    const [userId, setUserId] = useState<string | undefined>("");
    const pathname = usePathname();

    const [techniciansWorkload, setTechniciansWorkload] = useState<any[]>([]);

    useEffect(() => {
        const handleZenMode = (e: CustomEvent) => {
            const shouldCollapse = e.detail?.collapsed;
            if (typeof shouldCollapse === 'boolean') {
                setIsCollapsed(shouldCollapse);
            }
        };

        window.addEventListener('zen-mode-change' as any, handleZenMode);
        return () => window.removeEventListener('zen-mode-change' as any, handleZenMode);
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const fetchData = async () => {
            try {
                const user = await getUserData();
                if (user) {
                    setUserName(user.name);
                    setUserEmail(user.email);
                    setUserId(user.id);


                    // Fetch technicians workload
                    // const { getTechniciansWorkload } = await import("@/actions/dashboard-actions");

                    // Initial fetch
                    try {
                        const workload = await getTechniciansWorkload(user.branch?.id);
                        setTechniciansWorkload(workload);
                    } catch (e) {
                        console.error("Initial workload fetch error", e);
                    }

                    // Poll every 10 seconds
                    intervalId = setInterval(async () => {
                        try {
                            const updatedWorkload = await getTechniciansWorkload(user.branch?.id);
                            setTechniciansWorkload(updatedWorkload);
                        } catch (e) {
                            console.error("Polling error", e);
                        }
                    }, 10000);
                }
            } catch (error) {
                console.error("Error initializing admin layout:", error);
            }
        };

        fetchData();

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
            <div className="print:hidden">
                <Sidebar
                    groups={adminGroups}
                    onCollapseChange={setIsCollapsed}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>
            <motion.div
                animate={{
                    paddingLeft: isMobile ? "0px" : (isCollapsed ? "4.5rem" : "17rem"),
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className="flex-1 print:!pl-0 print:!m-0"
            >
                <div className="print:hidden">
                    <Header
                        title="Panel de Administración"
                        userName={userName}
                        userEmail={userEmail}
                        userId={userId}
                        techniciansWorkload={techniciansWorkload}
                        profileHref="/admin/profile"
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                </div>
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
                        className="p-6 print:p-0"
                    >
                        {children}
                    </motion.main>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
