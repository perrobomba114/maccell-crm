"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LucideIcon, LayoutDashboard, Users, Building2, Package, Wrench, ShoppingCart, FileText, Receipt, ClipboardList, Sparkles, ChevronLeft, ChevronRight, Star, List, History, Box, BarChart3, Banknote, Percent, RotateCcw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Icon mapping for all possible icons
const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Users,
    Building2,
    Package,
    Wrench,
    ShoppingCart,
    FileText,
    Receipt,
    ClipboardList,
    Star,
    List,
    History,
    Box,
    BarChart3,
    Banknote,
    Percent,
    RotateCcw,
    Settings,
};

interface SidebarLink {
    href: string;
    label: string;
    icon: string;
}

interface SidebarGroup {
    label?: string;
    items: SidebarLink[];
}

interface SidebarProps {
    links?: SidebarLink[];
    groups?: SidebarGroup[];
    accentColor?: string;
    onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ links = [], groups, accentColor = "primary", onCollapseChange }: SidebarProps) {
    const pathname = usePathname();
    // ... (keep state logic same)
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved !== null) {
            const collapsed = saved === "true";
            setIsCollapsed(collapsed);
            onCollapseChange?.(collapsed);
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", String(newState));
        onCollapseChange?.(newState);
    };

    useEffect(() => {
        if (!isMounted) return;
        const handleResize = () => {
            if (window.innerWidth < 768 && !isCollapsed) {
                setIsCollapsed(true);
                localStorage.setItem("sidebar-collapsed", "true");
                onCollapseChange?.(true);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isMounted, isCollapsed, onCollapseChange]);


    const renderLink = (link: SidebarLink) => {
        const Icon = iconMap[link.icon as keyof typeof iconMap] || LayoutDashboard;
        const isActive = pathname === link.href;

        const linkContent = (
            <Link
                key={link.href}
                href={link.href}
                className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
                    isActive
                        ? "text-primary bg-primary/10 shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:shadow-sm",
                    isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "w-full"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-primary group-hover:scale-110"
                )} />

                {!isCollapsed && (
                    <span className="truncate">{link.label}</span>
                )}

                {isActive && !isCollapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                        {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border-border shadow-md">
                        {link.label}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return linkContent;
    };

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isCollapsed ? "4.5rem" : "17rem",
            }}
            transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border/30 bg-background backdrop-blur-xl shadow-xl"
        >
            <div className="flex h-full flex-col">
                {/* Logo Area */}
                <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border/30 px-4">
                    <Link href="/" className="flex items-center gap-3 group overflow-hidden w-full">
                        <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8">
                            <Sparkles className="h-6 w-6 text-primary relative z-10 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <span className="font-bold text-lg text-sidebar-foreground tracking-tight">MacCell</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Link>
                </div>

                {/* Navigation Links */}
                <TooltipProvider delayDuration={0}>
                    <nav className="flex-1 space-y-4 p-3 overflow-y-auto custom-scrollbar">
                        {groups ? (
                            groups.map((group, index) => (
                                <div key={index} className="space-y-1">
                                    {!isCollapsed && group.label && (
                                        <div className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 mt-4 first:mt-0">
                                            {group.label}
                                        </div>
                                    )}
                                    {isCollapsed && <div className="h-px bg-border/40 mx-2 my-2 first:hidden" />}
                                    <div className="space-y-1">
                                        {group.items.map(link => renderLink(link))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="space-y-1">
                                {links.map(link => renderLink(link))}
                            </div>
                        )}
                    </nav>
                </TooltipProvider>

                {/* Toggle Button */}
                <div className="border-t border-sidebar-border/30 p-3 flex justify-center">
                    <button
                        onClick={toggleCollapse}
                        className={cn(
                            "flex items-center justify-center rounded-lg p-2 transition-all duration-200",
                            "text-sidebar-foreground/60 hover:text-primary hover:bg-sidebar-accent/50",
                            "hover:scale-105 active:scale-95",
                            "w-full h-10"
                        )}
                        aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <ChevronLeft className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>
        </motion.aside>
    );
}
