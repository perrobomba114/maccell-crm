"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LucideIcon, LayoutDashboard, Users, Building2, Package, Wrench, ShoppingCart, FileText, Receipt, ClipboardList, Sparkles, ChevronLeft, ChevronRight, Star, List, History, Box, BarChart3, Banknote, Percent, RotateCcw, Settings, Menu, X, ShieldCheck, Database, Bell } from "lucide-react";
import { cn, getImgUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
// Removed missing hook import


// Icon mapping (same as before)
const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard, Users, Building2, Package, Wrench, ShoppingCart, FileText, Receipt, ClipboardList, Star, List, History, Box, BarChart3, Banknote, Percent, RotateCcw, Settings, ShieldCheck, Database, Bell
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
    // Mobile controls
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({
    links = [],
    groups,
    accentColor = "primary",
    onCollapseChange,
    isOpen: externalIsOpen,
    onClose
}: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    // Use external open state if provided, otherwise internal (for backward compatibility if needed)
    const [internalIsMobileOpen, setInternalIsMobileOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const isMobileOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsMobileOpen;
    const setIsMobileOpen = onClose ? (val: boolean) => !val && onClose() : setInternalIsMobileOpen;

    // Check media query safely
    useEffect(() => {
        const checkMobile = () => {
            // ... existing logic
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                const saved = localStorage.getItem("sidebar-collapsed");
                setIsCollapsed(saved === "true");
            } else {
                setIsCollapsed(true);
            }
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Sync external collapse state for layout padding
    useEffect(() => {
        onCollapseChange?.(isCollapsed);
    }, [isCollapsed, onCollapseChange]);

    const toggleCollapse = () => {
        if (isMobile) {
            if (onClose && isMobileOpen) {
                onClose();
            } else {
                setInternalIsMobileOpen(!internalIsMobileOpen);
            }
        } else {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            localStorage.setItem("sidebar-collapsed", String(newState));
        }
    };

    // Close mobile menu on navigate
    useEffect(() => {
        if (isMobile && isMobileOpen) {
            if (onClose) onClose();
            else setInternalIsMobileOpen(false);
        }
    }, [pathname, isMobile]);

    // Eliminated blocking isMounted check to render immediately
    // if (!isMounted) return null;

    const renderLink = (link: SidebarLink) => {
        const Icon = iconMap[link.icon as keyof typeof iconMap] || LayoutDashboard;
        const isActive = pathname === link.href;

        // Determine if we show label: Desktop Expanded OR Mobile Open
        const showLabel = (!isCollapsed && !isMobile) || (isMobile && isMobileOpen);

        const linkContent = (
            <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                    if (isMobile && isMobileOpen) {
                        if (onClose) onClose();
                        else setInternalIsMobileOpen(false);
                    }
                }}
                className={cn(
                    "relative flex items-center transition-all duration-200 overflow-hidden outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                        ? "text-primary bg-primary/10 shadow-sm font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    !showLabel
                        ? "justify-center w-10 h-10 mx-auto rounded-full"
                        : "w-full gap-3 px-3 py-2.5 rounded-xl",
                    // Mobile active state feedback
                    "active:scale-95"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                )} />

                {showLabel && (
                    <span className="truncate whitespace-nowrap opacity-100 transition-opacity duration-300">
                        {link.label}
                    </span>
                )}

                {isActive && showLabel && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
            </Link>
        );

        if (!showLabel) {
            return (
                <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                        {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border-border shadow-md z-[60]">
                        {link.label}
                    </TooltipContent>
                </Tooltip>
            );
        }
        return linkContent;
    };

    // Mobile Width logic:
    // If mobile: Inclosed = 0 (hidden), Open = 17rem
    // If Desktop: handle isCollapsed
    const sidebarWidth = isMobile
        ? (isMobileOpen ? "17rem" : "0rem")
        : (isCollapsed ? "4.5rem" : "17rem");

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            <AnimatePresence>
                {isMobile && isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onClose ? onClose() : setInternalIsMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    width: sidebarWidth,
                    x: isMobile && !isMobileOpen ? "-100%" : "0%",
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className={cn(
                    "fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border/30 bg-background/95 backdrop-blur-xl shadow-xl overflow-hidden",
                    isMobile && isMobileOpen ? "shadow-2xl ring-1 ring-white/10" : ""
                )}
            >
                <div className="flex h-full flex-col min-w-[4.5rem]">
                    {/* Logo Area */}
                    <div className="relative flex h-16 items-center border-b border-sidebar-border/30 px-3 overflow-hidden">
                        <Link href="/" className="flex items-center justify-center group w-full transition-all duration-300">
                            {((!isCollapsed && !isMobile) || (isMobile && isMobileOpen)) ? (
                                <motion.div
                                    key="expanded-logo"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center w-full"
                                >
                                    <img
                                        src={getImgUrl("/logo.jpg")}
                                        alt="MacCell"
                                        className="h-10 w-auto max-w-full object-contain"
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="collapsed-logo"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 p-1.5 transition-colors group-hover:bg-white/10"
                                >
                                    <img
                                        src={getImgUrl("/logo.jpg")}
                                        alt="Logo"
                                        className="h-full w-full object-contain"
                                    />
                                </motion.div>
                            )}
                        </Link>
                        {/* Mobile Close Button */}
                        {isMobile && isMobileOpen && (
                            <button
                                onClick={() => onClose?.()}
                                className="absolute top-1/2 right-3 -translate-y-1/2 p-1 rounded-full text-sidebar-foreground/60 hover:text-primary hover:bg-sidebar-accent/50 md:hidden"
                                aria-label="Close sidebar"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Navigation Links */}
                    <TooltipProvider delayDuration={0}>
                        <nav className="flex-1 space-y-4 p-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
                            {groups ? (
                                groups.map((group, index) => (
                                    <div key={index} className="space-y-1">
                                        {/* Label visible only when expanded */}
                                        {((!isCollapsed && !isMobile) || (isMobile && isMobileOpen)) && group.label && (
                                            <div className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 mt-4 first:mt-0 whitespace-nowrap">
                                                {group.label}
                                            </div>
                                        )}
                                        {/* Divider when collapsed */}
                                        {!((!isCollapsed && !isMobile) || (isMobile && isMobileOpen)) && (
                                            <div className="h-px bg-border/40 mx-2 my-2 first:hidden" />
                                        )}

                                        <div className="space-y-1 text-center">
                                            {group.items.map(link => renderLink(link))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-1 text-center">
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
                            {/* Logic for Icon:
                                Mobile Open -> ChevronLeft (Close)
                                Desktop -> Chevron
                            */}
                            {isMobile ? (
                                <ChevronLeft className="h-5 w-5" />
                            ) : (
                                isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
