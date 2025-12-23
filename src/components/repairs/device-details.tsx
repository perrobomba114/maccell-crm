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
        <div className="space-y-4 border p-4 rounded-lg bg-card">
            <h3 className="font-semibold flex items-center gap-2">📱 Dispositivo</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Marca</Label>
                    <Input
                        value={brand} onChange={(e) => onBrandChange(handleCapitalize(e.target.value))}
                        placeholder="Samsung"
                        className={cn(errors?.brand && "border-red-500")}
                    />
                    {errors?.brand && <p className="text-xs text-red-500">{errors.brand}</p>}
                </div>
                <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Modelo</Label>
                    <Input
                        value={model} onChange={(e) => onModelChange(e.target.value)}
                        placeholder="S21, iPhone 13..."
                        className={cn(errors?.model && "border-red-500")}
                    />
                    {errors?.model && <p className="text-xs text-red-500">{errors.model}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Problema / Falla</Label>
                <Textarea
                    value={problem} onChange={(e) => onProblemChange(handleCapitalize(e.target.value))}
                    placeholder="Describe el problema..."
                    rows={3}
                    className={cn(errors?.problem && "border-red-500")}
                />
                {errors?.problem && <p className="text-xs text-red-500">{errors.problem}</p>}
            </div>

            {/* Notes moved to main form */}
        </div>
    );
}
