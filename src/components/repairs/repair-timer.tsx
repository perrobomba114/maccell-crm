"use client";

import { useEffect, useState } from "react";
import { Clock, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPAIR_STATUS } from "@/lib/repairs/status";
import { getRepairTimerState } from "@/lib/repairs/timer";

interface RepairTimerProps {
    startedAt: Date | string | null;
    estimatedMinutes: number | null;
    statusId: number;
    onAdd?: () => void;
}

export function RepairTimer({ startedAt, estimatedMinutes, statusId, onAdd }: RepairTimerProps) {
    const [timer, setTimer] = useState({ text: "-", overdue: false });

    useEffect(() => {
        const update = () => setTimer(getRepairTimerState(startedAt, estimatedMinutes, statusId, Date.now()));
        update();
        if (statusId !== REPAIR_STATUS.IN_PROGRESS || !startedAt || !estimatedMinutes) return;
        const interval = window.setInterval(update, 1000);
        return () => window.clearInterval(interval);
    }, [startedAt, estimatedMinutes, statusId]);

    return (
        <div className="flex h-8 w-28 shrink-0 items-center justify-center whitespace-nowrap" translate="no">
            {timer.overdue && onAdd ? (
                <Button onClick={onAdd} variant="destructive" size="sm" className="h-8 w-full font-bold">
                    <PlusCircle className="mr-1.5 h-4 w-4 shrink-0" />
                    <span>Agregar</span>
                </Button>
            ) : (
                <div className={`flex items-center justify-center text-sm font-bold ${timer.overdue ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>
                    <Clock className="mr-1.5 h-4 w-4 shrink-0" />
                    <span className="font-mono tabular-nums">{timer.text}</span>
                </div>
            )}
        </div>
    );
}
