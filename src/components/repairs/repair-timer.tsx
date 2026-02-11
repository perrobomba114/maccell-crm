"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface RepairTimerProps {
    startedAt: Date | string | null;
    estimatedMinutes: number | null;
    statusId: number;
}

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface RepairTimerProps {
    startedAt: Date | string | null;
    estimatedMinutes: number | null;
    statusId: number;
    onAdd?: () => void;
}

export function RepairTimer({ startedAt, estimatedMinutes, statusId, onAdd }: RepairTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const updateText = () => {
            if (!startedAt || !estimatedMinutes) {
                setTimeLeft(estimatedMinutes ? `${estimatedMinutes} min` : "-");
                return;
            }

            if (statusId !== 3) { // 3 is "In Process"
                setTimeLeft(`${estimatedMinutes} min`);
                return;
            }

            const start = new Date(startedAt).getTime();
            const durationMs = estimatedMinutes * 60 * 1000;
            const end = start + durationMs;
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("00m 00s");
                setIsOverdue(true);
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
            setIsOverdue(false);
        };

        updateText();
        const interval = statusId === 3 ? setInterval(updateText, 1000) : null;

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [startedAt, estimatedMinutes, statusId]);

    if (isOverdue && onAdd) {
        return (
            <Button
                onClick={onAdd}
                variant="destructive"
                size="sm"
                className="h-8 font-bold animate-pulse"
            >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Agregar
            </Button>
        );
    }

    return (
        <div className={`flex items-center justify-center h-7 font-bold text-sm ${isOverdue ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="tabular-nums">{timeLeft}</span>
        </div>
    );
}
