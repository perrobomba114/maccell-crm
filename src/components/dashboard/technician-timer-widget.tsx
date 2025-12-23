"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechnicianTimerWidgetProps {
    technicianId: string;
    name: string;
    isOnline: boolean;
    workload: number; // in minutes
}

export function TechnicianTimerWidget({ technicianId, name, isOnline, workload }: TechnicianTimerWidgetProps) {
    const [timeLeft, setTimeLeft] = useState<string>("--");
    const [colorClass, setColorClass] = useState<string>("bg-muted text-muted-foreground");

    useEffect(() => {
        // 1. Workload Logic (Takes precedence)
        if (workload > 0) {
            const minutes = Math.ceil(workload);
            setTimeLeft(`${minutes} min`);

            if (minutes > 80) {
                setColorClass("bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200");
            } else if (minutes > 40) {
                setColorClass("bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200");
            } else {
                setColorClass("bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200");
            }
            return;
        }

        // 2. No Active Workload Logic
        if (!isOnline) {
            // Offline and no work
            setTimeLeft("OFF");
            setColorClass("bg-muted text-muted-foreground border-border");
        } else {
            // Online and free
            setTimeLeft("0 min");
            setColorClass("bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200");
        }
    }, [isOnline, workload]);

    // Extract first name for compactness
    const firstName = name.split(" ")[0];

    return (
        <Badge variant="outline" className={cn("flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium border transition-colors duration-300", colorClass)}>
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{firstName}:</span>
            <span>{timeLeft}</span>
        </Badge>
    );
}
