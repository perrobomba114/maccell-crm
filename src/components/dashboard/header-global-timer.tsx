"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderGlobalTimerProps {
    repair: {
        id: string;
        ticketNumber: string;
        startedAt: Date | string | null;
        estimatedTime: number | null;
    } | null;
}

export function HeaderGlobalTimer({ repair }: HeaderGlobalTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("--");
    const [colorClass, setColorClass] = useState<string>("bg-muted text-muted-foreground");

    useEffect(() => {
        console.log("HeaderGlobalTimer mounted with repair:", repair);
        if (!repair || repair.estimatedTime === null || repair.estimatedTime === undefined) {
            setTimeLeft("--");
            setColorClass("bg-muted text-muted-foreground");
            return;
        }

        // Shared color logic
        const getColorClass = (minutes: number) => {
            if (minutes > 80) {
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
            } else if (minutes > 40) {
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200";
            } else {
                return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
            }
        };

        if (!repair.startedAt) {
            const minutes = Math.round(repair.estimatedTime);
            setTimeLeft(`${minutes} min`);
            setColorClass(getColorClass(minutes));
            return;
        }

        const calculateTime = () => {
            const start = new Date(repair.startedAt!).getTime();
            const durationMs = repair.estimatedTime! * 60 * 1000;
            const end = start + durationMs;
            const now = new Date().getTime();
            const diff = end - now;

            const minutesLeft = Math.floor(diff / (1000 * 60));

            // Special case for Idle/Zero workload (Explicit 0 from server)
            if (repair.estimatedTime === 0) {
                setTimeLeft("0 min");
                setColorClass(getColorClass(0));
                return;
            }

            if (diff <= 0) {
                setTimeLeft("0 min");
                setColorClass("bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200");
                return;
            }

            setColorClass(getColorClass(minutesLeft));
            setTimeLeft(`${minutesLeft} min`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [repair]);

    // Render always, showing current state
    return (
        <div className="flex items-center gap-2 mr-2">
            <Badge variant="outline" className={`flex items-center gap-1.5 py-1.5 px-4 text-base font-bold border ${colorClass}`}>
                <Clock className="w-4 h-4" />
                <span>Global: {timeLeft}</span>
            </Badge>
        </div>
    );
}
