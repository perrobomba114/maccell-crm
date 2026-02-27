"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Trophy, Wrench } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getTechnicianPerformance, TechnicianPerformance } from "@/actions/repair-actions-extra";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function TechnicianStatsCards() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [stats, setStats] = useState<TechnicianPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        // Initialize from URL or default to today
        const dateParam = searchParams.get("date");
        if (dateParam) {
            setDate(new Date(dateParam));
        } else {
            setDate(new Date());
        }
    }, [searchParams]);

    useEffect(() => {
        if (date) {
            loadStats();
        }
    }, [date]);

    const loadStats = async () => {
        setLoading(true);
        const res = await getTechnicianPerformance(date);
        if (res.success && res.data) {
            // Sort by repairedCount descending
            const sorted = [...res.data].sort((a, b) => b.repairedCount - a.repairedCount);
            setStats(sorted);
        }
        setLoading(false);
    }

    const getCardStyles = (index: number) => {
        if (index === 0) return "bg-purple-600 text-white border-none shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer hover:ring-4 hover:ring-purple-300/50";
        if (index === 1) return "bg-blue-600 text-white border-none shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:ring-4 hover:ring-blue-300/50";
        return "bg-orange-500 text-white border-none shadow-md cursor-pointer transition-all duration-300 hover:scale-105 hover:ring-4 hover:ring-orange-300/50";
    }

    const handleTechClick = (techName: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (params.get("tech") === techName) {
            params.delete("tech"); // Toggle off
        } else {
            params.set("tech", techName);
        }
        params.delete("page"); // Reset pagination
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleDateChange = (d: Date | undefined) => {
        if (d) {
            setDate(d);
            setIsCalendarOpen(false);
            const params = new URLSearchParams(searchParams.toString());
            // Store as ISO string (date part only to avoid timezone shifts if possible, or straight ISO)
            params.set("date", d.toISOString());
            params.delete("page");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg w-fit">
                <span className="text-sm font-medium text-muted-foreground pl-2">Filtrar rendimiento por fecha:</span>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            size="sm"
                            className={cn(
                                "w-[240px] justify-start text-left font-normal bg-background hover:bg-background/90",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP", { locale: es }) : <Skeleton className="h-4 w-32" />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateChange}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="bg-muted/50 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    <Skeleton className="h-6 w-32" />
                                </CardTitle>
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold"><Skeleton className="h-10 w-16 mb-2" /></div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : stats.length > 0 ? (
                    stats.slice(0, 3).map((tech, index) => {
                        const isActive = searchParams.get("tech") === tech.name;
                        return (
                            <Card
                                key={tech.id}
                                onClick={() => handleTechClick(tech.name)}
                                className={cn("relative overflow-hidden", getCardStyles(index), isActive && "ring-4 ring-offset-2 ring-foreground/50 scale-105")}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                                    <CardTitle className="text-lg font-bold flex items-center gap-1.5 leading-none">
                                        {index === 0 && <Trophy className="h-5 w-5 text-yellow-300 animate-pulse" />}
                                        <span className="truncate">{tech.name}</span>
                                        {isActive && <span className="ml-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
                                    </CardTitle>
                                    <div className={cn("p-1.5 rounded-full", index === 0 ? "bg-white/20" : "bg-white/10")}>
                                        <Wrench className="h-4 w-4 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <div className="text-5xl font-extrabold my-2 tracking-tighter shadow-sm">{tech.repairedCount}</div>
                                    <div className="flex items-center gap-2 bg-black/20 w-fit px-2 py-1.5 rounded-md backdrop-blur-sm">
                                        <Clock className="h-4 w-4 opacity-90" />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] opacity-80 font-medium uppercase tracking-wider">Promedio</span>
                                            <span className="text-sm font-bold">{tech.avgTime}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                {/* Decorative background element */}
                                <div className="absolute -bottom-4 -right-4 bg-white/10 w-20 h-20 rounded-full blur-2xl pointer-events-none" />
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-3 text-center text-muted-foreground py-8 text-sm bg-muted/20 rounded-xl border-2 border-dashed flex flex-col items-center gap-2">
                        <Wrench className="h-8 w-8 opacity-20" />
                        <p>No hay registro de reparaciones para esta fecha.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
