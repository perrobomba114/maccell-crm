"use client";

import { useState } from "react";
import { CreditCard, Fingerprint, KeyRound, MemoryStick, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
    { value: "NONE", label: "Sin código", description: "El equipo no tiene bloqueo" },
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
        <section className={cn(
            "overflow-hidden rounded-xl border bg-slate-950 text-slate-100 shadow-sm",
            error ? "border-red-500" : "border-slate-800",
        )} aria-labelledby="repair-intake-title">
            <div className="flex items-start gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-amber-300">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                    <h3 id="repair-intake-title" className="text-sm font-black uppercase tracking-[0.16em]">
                        Recepción del equipo
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Registrá el acceso y los elementos que quedan bajo custodia.
                    </p>
                </div>
            </div>

            <div className="space-y-5 p-4">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
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
                                        "rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                                        selected
                                            ? "border-amber-400 bg-amber-400 text-slate-950"
                                            : "border-slate-700 bg-slate-900 hover:border-slate-500",
                                    )}
                                >
                                    <span className="flex items-center gap-2 text-sm font-black">
                                        {option.value === "CODE" ? <KeyRound className="h-4 w-4" /> : null}
                                        {option.value === "PATTERN" ? <Fingerprint className="h-4 w-4" /> : null}
                                        {option.value === "NONE" ? <ShieldCheck className="h-4 w-4" /> : null}
                                        {option.label}
                                    </span>
                                    <span className={cn("mt-1 block text-[10px]", selected ? "text-slate-800" : "text-slate-500")}>
                                        {option.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {value.accessType === "CODE" ? (
                    <div className="space-y-2">
                        <Label htmlFor="access-credential" className="text-xs font-bold text-slate-200">
                            Código, PIN o contraseña
                        </Label>
                        <Input
                            id="access-credential"
                            value={value.accessCredential ?? ""}
                            onChange={(event) => onChange({ ...value, accessCredential: event.target.value })}
                            placeholder="Ej: 2580"
                            autoComplete="off"
                            maxLength={128}
                            className="h-12 border-slate-700 bg-slate-900 font-mono text-lg tracking-[0.2em] text-white placeholder:tracking-normal"
                        />
                    </div>
                ) : null}

                {value.accessType === "PATTERN" ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider">Dibujar patrón</p>
                                <p className="mt-1 text-[10px] text-slate-500">Tocá o arrastrá por 4 puntos como mínimo.</p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onChange({ ...value, accessCredential: "" })}
                                disabled={patternPoints.length === 0}
                                className="h-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Limpiar
                            </Button>
                        </div>
                        <div
                            className="mx-auto grid w-48 touch-none grid-cols-3 gap-5 rounded-xl border border-slate-800 bg-slate-950 p-5"
                            onPointerUp={() => setIsDrawing(false)}
                            onPointerLeave={() => setIsDrawing(false)}
                        >
                            {Array.from({ length: 9 }, (_, index) => index + 1).map((point) => {
                                const order = patternPoints.indexOf(point);
                                return (
                                    <button
                                        key={point}
                                        type="button"
                                        aria-label={`Punto ${point}${order >= 0 ? `, posición ${order + 1}` : ""}`}
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            setIsDrawing(true);
                                            addPatternPoint(point);
                                        }}
                                        onPointerEnter={(event) => {
                                            if (isDrawing && event.buttons === 1) addPatternPoint(point);
                                        }}
                                        className={cn(
                                            "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black transition-colors",
                                            order >= 0
                                                ? "border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                                                : "border-slate-600 bg-slate-800 text-slate-500 hover:border-slate-400",
                                        )}
                                    >
                                        {order >= 0 ? order + 1 : ""}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                        value.hasSimCard ? "border-cyan-400 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60",
                    )}>
                        <Checkbox
                            checked={value.hasSimCard}
                            onCheckedChange={(checked) => onChange({ ...value, hasSimCard: checked === true })}
                            className="border-slate-500 data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-slate-950"
                        />
                        <CreditCard className="h-5 w-5 text-cyan-300" />
                        <span className="text-sm font-bold">Deja chip / SIM</span>
                    </label>
                    <label className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                        value.hasMemoryCard ? "border-cyan-400 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60",
                    )}>
                        <Checkbox
                            checked={value.hasMemoryCard}
                            onCheckedChange={(checked) => onChange({ ...value, hasMemoryCard: checked === true })}
                            className="border-slate-500 data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-slate-950"
                        />
                        <MemoryStick className="h-5 w-5 text-cyan-300" />
                        <span className="text-sm font-bold">Deja tarjeta de memoria</span>
                    </label>
                </div>

                {error ? <p className="text-xs font-bold text-red-400">{error}</p> : null}
            </div>

            <input type="hidden" name="accessType" value={value.accessType} />
            <input type="hidden" name="accessCredential" value={value.accessCredential ?? ""} />
            <input type="hidden" name="hasSimCard" value={String(value.hasSimCard)} />
            <input type="hidden" name="hasMemoryCard" value={String(value.hasMemoryCard)} />
        </section>
    );
}
