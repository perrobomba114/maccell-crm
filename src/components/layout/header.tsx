"use client";

import { ModeToggle } from "@/components/shared/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Menu } from "lucide-react";
import { logout } from "@/actions/auth-actions";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TechnicianTimerWidget } from "../dashboard/technician-timer-widget";
import { DollarWidget } from "../admin/dollar-widget";
import { NotificationBell } from "@/components/ui/notification-bell";
import { getImgUrl } from "@/lib/utils";

interface HeaderProps {
    userName?: string;
    userEmail?: string;
    userImage?: string | null;
    userId?: string;
    title: string;
    techniciansWorkload?: {
        id: string;
        name: string;
        isOnline: boolean;
        workload: number;
    }[];
    profileHref?: string;
    onMenuClick?: () => void;
}

// force cache update
export function Header({
    userName = "Usuario",
    userEmail = "",
    userImage,
    userId,
    title,
    techniciansWorkload = [],
    profileHref,
    onMenuClick
}: HeaderProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();



    const handleLogout = () => {
        startTransition(async () => {
            try {
                await logout();
                router.push("/login");
            } catch (error) {
                toast.error("Error al cerrar sesión");
                console.error("Logout error:", error);
            }
        });
    };

    // Get initials from user name
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
                {/* Title + Mobile Menu */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate max-w-[150px] md:max-w-none">
                        {title}
                    </h1>
                </div>

                {/* Right side: Theme toggle + User menu */}
                <div className="flex items-center gap-4">
                    {/* Tech Widgets - Hidden on mobile to avoid overcrowding */}
                    <div className="hidden lg:flex items-center gap-2 mr-2">
                        {techniciansWorkload.map((tech) => (
                            <TechnicianTimerWidget
                                key={tech.id}
                                technicianId={tech.id}
                                name={tech.name}
                                isOnline={tech.isOnline}
                                workload={tech.workload}
                            />
                        ))}
                    </div>

                    <div className="hidden sm:block">
                        <DollarWidget />
                    </div>

                    <NotificationBell userId={userId || ""} />
                    <ModeToggle />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                <Avatar className="h-10 w-10">
                                    {userImage && (
                                        <AvatarImage src={getImgUrl(userImage)} alt={userName} className="object-cover" />
                                    )}
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {getInitials(userName)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{userName}</p>
                                    {userEmail && (
                                        <p className="text-xs text-muted-foreground">{userEmail}</p>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push(profileHref || "/admin/profile")}
                                className="cursor-pointer"
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                disabled={isPending}
                                className="text-destructive focus:text-destructive"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
