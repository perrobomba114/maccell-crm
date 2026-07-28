"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getUserData } from "@/actions/get-user";

import { adminGroups } from "@/components/layout/nav-config";
import { getTechniciansWorkload } from "@/actions/dashboard-actions";
import { PresenceHeartbeat } from "@/components/shared/presence-heartbeat";
import { RepairChatProvider } from "@/components/repair-chat/repair-chat-provider";

type TechnicianWorkload = Awaited<ReturnType<typeof getTechniciansWorkload>>;

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userName, setUserName] = useState<string | undefined>("Usuario");
    const [userEmail, setUserEmail] = useState<string | undefined>("");
    const [userImage, setUserImage] = useState<string | null | undefined>(null);
    const [userId, setUserId] = useState<string | undefined>("");
    const [techniciansWorkload, setTechniciansWorkload] = useState<TechnicianWorkload>([]);

    useEffect(() => {
        const handleZenMode = (event: Event) => {
            const shouldCollapse = event instanceof CustomEvent ? event.detail?.collapsed : undefined;
            if (typeof shouldCollapse === 'boolean') {
                setIsCollapsed(shouldCollapse);
            }
        };

        const handleUserUpdate = () => {
            void fetchData();
        };

        window.addEventListener("zen-mode-change", handleZenMode);
        window.addEventListener("user-data-updated", handleUserUpdate);

        return () => {
            window.removeEventListener("zen-mode-change", handleZenMode);
            window.removeEventListener("user-data-updated", handleUserUpdate);
        };
    }, []);

    const fetchData = async () => {
        try {
            const user = await getUserData();
            if (user) {
                setUserName(user.name);
                setUserEmail(user.email);
                setUserImage(user.imageUrl);
                setUserId(user.id);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const initializeData = async () => {
            try {
                const user = await getUserData();
                if (user) {
                    setUserName(user.name);
                    setUserEmail(user.email);
                    setUserImage(user.imageUrl);
                    setUserId(user.id);

                    // Fetch technicians workload
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
        <RepairChatProvider userId={userId ?? ""} role="ADMIN">
        <div className="flex min-h-screen" suppressHydrationWarning>
            <PresenceHeartbeat />
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
                        title=""
                        userName={userName}
                        userEmail={userEmail}
                        userImage={userImage}
                        userId={userId}
                        techniciansWorkload={techniciansWorkload}
                        profileHref="/admin/profile"
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                </div>
                <main className="p-6 pt-[5.5rem] md:pt-6 print:p-0">
                    {children}
                </main>
            </motion.div>
        </div>
        </RepairChatProvider>
    );
}
