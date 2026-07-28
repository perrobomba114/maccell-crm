"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { calculatePromisedDateAction } from "@/lib/actions/repairs";
import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";

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

    return (
        <div className="space-y-3">
            <Label htmlFor="promised-date" className="text-sm font-medium">Fecha y hora de entrega</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
                            className="min-h-12 min-w-0 rounded-xl border border-input bg-background/70 px-3 font-mono text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex min-h-12 items-center justify-center rounded-xl border border-input bg-background/70 px-3 font-mono tabular-nums focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                            <Clock aria-hidden="true" className="mr-2 h-4 w-4 text-muted-foreground" />
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
                                className="h-10 w-8 appearance-none border-0 bg-transparent p-0 text-center text-lg font-semibold text-foreground outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span aria-hidden="true" className="px-0.5 text-lg font-semibold text-muted-foreground">:</span>
                            <input
                                type="number"
                                id="promised-minutes"
                                name="promised-minutes"
                                aria-label="Minutos de entrega"
                                inputMode="numeric"
                                min={0}
                                max={59}
                                step={1}
                                value={String(date.getMinutes()).padStart(2, '0')}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 59) {
                                        const newDate = new Date(date);
                                        newDate.setMinutes(val);
                                        onChange(newDate);
                                    }
                                }}
                                className="h-10 w-8 appearance-none border-0 bg-transparent p-0 text-center text-lg font-semibold text-foreground outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 bg-background/50 font-medium"
                    onClick={() => handleAddMinutes(30)}
                    disabled={loading}
                >
                    {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : "+30 minutos"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 bg-background/50 font-medium"
                    onClick={() => handleAddMinutes(60)}
                    disabled={loading}
                >
                    {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : "+60 minutos"}
                </Button>
            </div>
        </div>
    );
}
