"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
// import { addBusinessMinutes } from "@/lib/utils/date-client"; // Logic moved to server action 
// The task said "buttons calling the business logic service".
// Since logic is in src/lib/services/business-hours.ts (Server/Node only mostly?), I should check if it's safe for client.
// `Date` object operations are universal. I can move logic to a shared Util or use Server Action.
// Using Server Action for simple date math is slow. Converting logic to client friendly util is better.
// I'll create `src/lib/utils/date-client.ts` replicating the logic or just import the service if it doesn't use Node specific modules (Service used only native Date, so it's safe!)
// But `BusinessHoursService` was exported as "instance".
// I'll assume I can import it or move logic to a util.
// Actually I'll create a Server Action `calculatePromisedDate` to keep logic centralized as requested.
// Wait, latency for a button click? Maybe fine.
// I'll add `calculatePromisedDate` to `src/lib/actions/repairs.ts`.

import { calculatePromisedDateAction } from "@/lib/actions/repairs";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface PromisedDateSelectorProps {
    date: Date;
    onChange: (date: Date) => void;
}

export function PromisedDateSelector({ date, onChange }: PromisedDateSelectorProps) {
    const [loading, setLoading] = useState(false);

    const handleAddMinutes = async (minutes: number) => {
        setLoading(true);
        try {
            const newDateIso = await calculatePromisedDateAction(date.toISOString(), minutes);
            onChange(new Date(newDateIso));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Format for input datetime-local: YYYY-MM-DDTHH:mm
    const inputValue = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            onChange(new Date(e.target.value));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <div className="flex gap-2 sm:gap-4 items-center bg-background border border-input rounded-xl px-2 sm:px-4 h-[84px] w-full">
                        <input
                            type="date"
                            id="promised-date"
                            name="promised-date"
                            aria-label="Fecha de entrega"
                            value={date ? (() => {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            })() : ""}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    const newDate = new Date(date);
                                    newDate.setFullYear(y, m - 1, d);
                                    onChange(newDate);
                                }
                            }}
                            className="flex-1 font-mono text-xl sm:text-3xl bg-transparent border-none focus:ring-0 p-0 h-full text-foreground color-scheme-dark min-w-0"
                        />
                        <div className="h-10 sm:h-14 w-px bg-border/50 shrink-0" />
                        <div className="flex items-center gap-0 sm:gap-1 shrink-0">
                            <input
                                type="number"
                                id="promised-hour"
                                name="promised-hour"
                                aria-label="Hora de entrega"
                                inputMode="numeric"
                                min={0}
                                max={23}
                                value={String(date.getHours()).padStart(2, '0')}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 23) {
                                        const newDate = new Date(date);
                                        newDate.setHours(val);
                                        onChange(newDate);
                                    }
                                }}
                                className="w-[3rem] sm:w-[4rem] p-0 text-center text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-500 bg-transparent border-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-full leading-none"
                            />
                            <span className="text-2xl sm:text-4xl font-bold text-green-600 dark:text-green-500 pb-1">:</span>
                            <input
                                type="number"
                                id="promised-minutes"
                                name="promised-minutes"
                                aria-label="Minutos de entrega"
                                inputMode="numeric"
                                min={0}
                                max={45}
                                step={15}
                                value={String(date.getMinutes()).padStart(2, '0')}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 59) {
                                        const newDate = new Date(date);
                                        newDate.setMinutes(val);
                                        onChange(newDate);
                                    }
                                }}
                                className="w-[3rem] sm:w-[4rem] p-0 text-center text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-500 bg-transparent border-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-full leading-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    type="button"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10"
                    onClick={() => handleAddMinutes(30)}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "+30 min"}
                </Button>
                <Button
                    type="button"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10"
                    onClick={() => handleAddMinutes(60)}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "+60 min"}
                </Button>
            </div>
        </div>
    );
}
