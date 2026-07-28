"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DeviceDetailsProps {
    brand: string;
    onBrandChange: (val: string) => void;
    model: string;
    onModelChange: (val: string) => void;
    problem: string;
    onProblemChange: (val: string) => void;

    errors?: {
        brand?: string;
        model?: string;
        problem?: string;
    }
}

export function DeviceDetails({
    brand, onBrandChange,
    model, onModelChange,
    problem, onProblemChange,
    errors
}: DeviceDetailsProps) {
    // Helper to enforce sentence case: "text" -> "Text", "TEXT" -> "Text"
    const handleCapitalize = (val: string) => {
        if (!val) return val;
        return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="device-brand" className="after:content-['*'] after:ml-0.5 after:text-red-500">Marca</Label>
                    <Input
                        id="device-brand"
                        name="device-brand"
                        value={brand} onChange={(e) => onBrandChange(handleCapitalize(e.target.value))}
                        placeholder="Samsung"
                        autoComplete="off"
                        className={cn("min-h-11 bg-background/70 text-base", errors?.brand && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {errors?.brand ? <p role="alert" className="text-xs font-medium text-destructive">{errors.brand}</p> : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="device-model" className="after:content-['*'] after:ml-0.5 after:text-red-500">Modelo</Label>
                    <Input
                        id="device-model"
                        name="device-model"
                        value={model} onChange={(e) => onModelChange(e.target.value)}
                        placeholder="S21, iPhone 13..."
                        autoComplete="off"
                        className={cn("min-h-11 bg-background/70 text-base", errors?.model && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {errors?.model ? <p role="alert" className="text-xs font-medium text-destructive">{errors.model}</p> : null}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="device-problem" className="after:content-['*'] after:ml-0.5 after:text-red-500">Problema / Falla</Label>
                <Textarea
                    id="device-problem"
                    name="device-problem"
                    value={problem} onChange={(e) => onProblemChange(handleCapitalize(e.target.value))}
                    placeholder="Describe el problema..."
                    rows={2}
                    className={cn("min-h-20 resize-y bg-background/70 text-base", errors?.problem && "border-destructive focus-visible:ring-destructive/20")}
                />
                {errors?.problem ? <p role="alert" className="text-xs font-medium text-destructive">{errors.problem}</p> : null}
            </div>
        </div>
    );
}
