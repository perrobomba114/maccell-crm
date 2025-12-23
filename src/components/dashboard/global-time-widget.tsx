"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface GlobalRepairTimerProps {
    repair: {
        id: string;
        ticketNumber: string;
        startedAt: Date | string | null;
        estimatedTime: number | null;
    } | null;
}

export function GlobalRepairTimer({ repair }: GlobalRepairTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("--");
    const [totalMinutesLeft, setTotalMinutesLeft] = useState<number>(0);
    const [colorClass, setColorClass] = useState<string>("text-muted-foreground");

    useEffect(() => {
        if (!repair || repair.estimatedTime === null || repair.estimatedTime === undefined) {
            setTimeLeft("Sin activos");
            setColorClass("text-muted-foreground");
            return;
        }

        // Handle PAUSED state (Allocated but not started)
        if (!repair.startedAt) {
            setTimeLeft(`${Math.round(repair.estimatedTime)} min`);
            setColorClass("text-blue-500");
            return;
        }

        const calculateTime = () => {
            const start = new Date(repair.startedAt!).getTime();
            const durationMs = repair.estimatedTime! * 60 * 1000;
            const end = start + durationMs;
            const now = new Date().getTime();
            const diff = end - now;

            // Calculate total remaining minutes
            const minutesLeft = Math.floor(diff / (1000 * 60));
            setTotalMinutesLeft(minutesLeft);

            if (diff <= 0) {
                setTimeLeft("Excedido");
                // > 80 rule? If exceeded, it's definitely Red.
                setColorClass("text-red-500");
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Determine Color based on MINUTES LEFT (Countdown value)
            if (minutesLeft > 80) {
                setColorClass("text-red-500");
            } else if (minutesLeft > 40) {
                setColorClass("text-yellow-500");
            } else {
                setColorClass("text-green-500");
            }

            setTimeLeft(`${minutesLeft} min`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [repair]);

    return (
        <Card className="group relative overflow-hidden">
            {/* Gradient overlay based on color? */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>

            <CardHeader className="relative z-10 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Tiempo Global</CardTitle>
                    <div className={`p-2 rounded-lg bg-muted/10 group-hover:scale-110 transition-transform duration-300 ${colorClass}`}>
                        <Clock className="h-5 w-5" />
                    </div>
                </div>
                <CardDescription>Mayor tiempo restante</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className={`text-5xl font-bold ${colorClass}`}>
                    {timeLeft}
                </div>
                {repair && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Ticket: #{repair.ticketNumber} ({repair.estimatedTime} min total)
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
