"use client";

import { useState } from "react";
import { CreditCard, Fingerprint, KeyRound, MemoryStick, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RepairPatternBoard } from "./repair-pattern-board";
import {
    appendPatternPoint,
    serializePattern,
    type RepairAccessType,
    type RepairIntake,
} from "@/lib/repairs/intake";

interface RepairIntakeFieldsProps {
    value: RepairIntake;
    error?: string;
    onChange: (value: RepairIntake) => void;
}

const ACCESS_OPTIONS: Array<{
    value: RepairAccessType;
    label: string;
    description: string;
}> = [
    { value: "CODE", label: "Código / PIN", description: "Número o contraseña" },
    { value: "PATTERN", label: "Patrón", description: "Cuadrícula de 9 puntos" },
    { value: "NONE", label: "Sin código / No autoriza", description: "El equipo no tiene bloqueo o el cliente no autoriza el acceso" },
];

function parsePattern(value: string | null): number[] {
    if (!value) return [];
    return value.split("-").map(Number).filter((point) => point >= 1 && point <= 9);
}

export function RepairIntakeFields({ value, error, onChange }: RepairIntakeFieldsProps) {
    const [isDrawing, setIsDrawing] = useState(false);
    const patternPoints = parsePattern(value.accessCredential);

    const setAccessType = (accessType: RepairAccessType) => {
        onChange({
            ...value,
            accessType,
            accessCredential: accessType === "NONE" ? null : "",
        });
    };

    const addPatternPoint = (point: number) => {
        const nextPoints = appendPatternPoint(patternPoints, point);
        if (nextPoints === patternPoints) return;
        onChange({ ...value, accessCredential: serializePattern(nextPoints) });
    };

    return (
        <div className={cn("space-y-5", error && "rounded-xl ring-2 ring-destructive/40")}>
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                        Acceso del equipo
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {ACCESS_OPTIONS.map((option) => {
                            const selected = value.accessType === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setAccessType(option.value)}
                                    className={cn(
                                        "min-h-16 rounded-xl border px-3 py-3 text-left transition-colors duration-200",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        selected
                                            ? "border-amber-400 bg-amber-400/15 text-foreground shadow-sm ring-2 ring-amber-400/35"
                                            : "border-border/70 bg-background/60 text-foreground hover:border-primary/40 hover:bg-muted/30",
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                        {option.value === "CODE" ? <KeyRound className="h-4 w-4" /> : null}
                                        {option.value === "PATTERN" ? <Fingerprint className="h-4 w-4" /> : null}
                                        {option.value === "NONE" ? <ShieldCheck className="h-4 w-4" /> : null}
                                        {option.label}
                                    </span>
                                    <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                                        {option.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {value.accessType === "CODE" ? (
                    <div className="space-y-2">
                        <Label htmlFor="access-credential" className="text-sm font-medium text-foreground">
                            Código, PIN o contraseña
                        </Label>
                        <Input
                            id="access-credential"
                            value={value.accessCredential ?? ""}
                            onChange={(event) => onChange({ ...value, accessCredential: event.target.value })}
                            placeholder="Ej: 2580"
                            autoComplete="off"
                            maxLength={128}
                            className="min-h-11 bg-background/70 font-mono text-base tracking-[0.18em] placeholder:tracking-normal"
                        />
                    </div>
                ) : null}

                {value.accessType === "PATTERN" ? (
                    <div className="grid gap-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="flex items-center justify-between gap-3 sm:block">
                            <div>
                                    <p className="text-sm font-semibold text-foreground">Dibujar patrón</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Tocá o arrastrá por 4 puntos como mínimo.</p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onChange({ ...value, accessCredential: "" })}
                                disabled={patternPoints.length === 0}
                                className="min-h-11 text-muted-foreground hover:bg-amber-500/10 hover:text-foreground sm:mt-3"
                            >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Limpiar
                            </Button>
                        </div>
                        <RepairPatternBoard
                            selectedPoints={patternPoints}
                            isDrawing={isDrawing}
                            onDrawingChange={setIsDrawing}
                            onPointSelect={addPatternPoint}
                        />
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors duration-200",
                        value.hasSimCard ? "border-cyan-500/70 bg-cyan-500/10 ring-1 ring-cyan-500/20" : "border-border/70 bg-background/60 hover:bg-muted/30",
                    )}>
                        <Checkbox
                            checked={value.hasSimCard}
                            onCheckedChange={(checked) => onChange({ ...value, hasSimCard: checked === true })}
                                className="data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500"
                            />
                            <CreditCard aria-hidden="true" className="h-5 w-5 text-cyan-500" />
                            <span className="text-sm font-semibold text-foreground">Deja chip / SIM</span>
                    </label>
                    <label className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors duration-200",
                        value.hasMemoryCard ? "border-cyan-500/70 bg-cyan-500/10 ring-1 ring-cyan-500/20" : "border-border/70 bg-background/60 hover:bg-muted/30",
                    )}>
                        <Checkbox
                            checked={value.hasMemoryCard}
                            onCheckedChange={(checked) => onChange({ ...value, hasMemoryCard: checked === true })}
                                className="data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500"
                            />
                            <MemoryStick aria-hidden="true" className="h-5 w-5 text-cyan-500" />
                            <span className="text-sm font-semibold text-foreground">Deja tarjeta de memoria</span>
                    </label>
                </div>

                {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}

            <input type="hidden" name="accessType" value={value.accessType} />
            <input type="hidden" name="accessCredential" value={value.accessCredential ?? ""} />
            <input type="hidden" name="hasSimCard" value={String(value.hasSimCard)} />
            <input type="hidden" name="hasMemoryCard" value={String(value.hasMemoryCard)} />
        </div>
    );
}
