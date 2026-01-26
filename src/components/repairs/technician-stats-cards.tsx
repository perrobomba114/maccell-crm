"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Wrench } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getTechnicianPerformance, TechnicianPerformance } from "@/actions/repair-actions-extra";
import { Skeleton } from "@/components/ui/skeleton";

export function TechnicianStatsCards() {
    const [date, setDate] = useState<Date>(new Date());
    const [stats, setStats] = useState<TechnicianPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [date]);

    const loadStats = async () => {
        setLoading(true);
        const res = await getTechnicianPerformance(date);
        if (res.success && res.data) {
            setStats(res.data);
        }
        setLoading(false);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Filtrar rendimiento por fecha:</span>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            size="sm"
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && setDate(d)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    <Skeleton className="h-4 w-24" />
                                </CardTitle>
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold"><Skeleton className="h-8 w-12" /></div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    <Skeleton className="h-3 w-32" />
                                </p>
                            </CardContent>
                        </Card>
                    ))
                ) : stats.length > 0 ? (
                    stats.slice(0, 3).map((tech) => (
                        <Card key={tech.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {tech.name}
                                </CardTitle>
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{tech.repairedCount}</div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    Promedio: {tech.avgTime}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-3 text-center text-muted-foreground py-4 text-sm bg-muted/20 rounded-lg border border-dashed">
                        No hay técnicos registrados o activos para esta fecha.
                    </div>
                )}
            </div>
        </div>
    );
}
