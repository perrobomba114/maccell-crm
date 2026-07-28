"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

interface RepairPatternBoardProps {
    selectedPoints: number[];
    isDrawing: boolean;
    onDrawingChange: (isDrawing: boolean) => void;
    onPointSelect: (point: number) => void;
}

type PatternCoordinate = {
    x: number;
    y: number;
};

type PatternSegment = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

interface RepairPatternPreviewProps {
    selectedPoints: number[];
    className?: string;
}

const PATTERN_COORDINATES: readonly PatternCoordinate[] = [
    { x: 22, y: 22 },
    { x: 88, y: 22 },
    { x: 154, y: 22 },
    { x: 22, y: 88 },
    { x: 88, y: 88 },
    { x: 154, y: 88 },
    { x: 22, y: 154 },
    { x: 88, y: 154 },
    { x: 154, y: 154 },
] as const;

const NODE_RADIUS = 22;
const ARROW_CLEARANCE = 7;

function getPatternSegment(fromPoint: number, toPoint: number): PatternSegment | null {
    const from = PATTERN_COORDINATES[fromPoint - 1];
    const to = PATTERN_COORDINATES[toPoint - 1];
    if (!from || !to) return null;

    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance === 0) return null;

    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const endOffset = NODE_RADIUS + ARROW_CLEARANCE;

    return {
        x1: from.x + unitX * NODE_RADIUS,
        y1: from.y + unitY * NODE_RADIUS,
        x2: to.x - unitX * endOffset,
        y2: to.y - unitY * endOffset,
    };
}

function PatternConnections({
    selectedPoints,
    markerId,
}: {
    selectedPoints: number[];
    markerId: string;
}) {
    const segments = selectedPoints.slice(1).flatMap((toPoint, index) => {
        const segment = getPatternSegment(selectedPoints[index], toPoint);
        return segment ? [segment] : [];
    });

    return (
        <>
            <defs>
                <marker
                    id={markerId}
                    markerHeight="7"
                    markerWidth="7"
                    orient="auto"
                    refX="6"
                    refY="3.5"
                    viewBox="0 0 7 7"
                >
                    <path d="M0 0L7 3.5L0 7Z" fill="#fde68a" />
                </marker>
            </defs>
            {segments.map((segment, index) => (
                <g key={`${selectedPoints[index]}-${selectedPoints[index + 1]}`}>
                    <line
                        x1={segment.x1}
                        y1={segment.y1}
                        x2={segment.x2}
                        y2={segment.y2}
                        stroke="rgba(0, 0, 0, 0.82)"
                        strokeLinecap="round"
                        strokeWidth="9"
                    />
                    <line
                        x1={segment.x1}
                        y1={segment.y1}
                        x2={segment.x2}
                        y2={segment.y2}
                        markerEnd={`url(#${markerId})`}
                        stroke="#fbbf24"
                        strokeLinecap="round"
                        strokeWidth="4"
                    />
                </g>
            ))}
        </>
    );
}

export function RepairPatternPreview({ selectedPoints, className }: RepairPatternPreviewProps) {
    const markerId = `repair-pattern-preview-${useId().replaceAll(":", "")}`;

    return (
        <svg
            role="img"
            aria-label={`Patrón registrado: ${selectedPoints.join(", ")}`}
            className={cn(
                "h-36 w-36 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-slate-950 to-amber-950/30 p-2 shadow-inner shadow-black/35",
                className,
            )}
            viewBox="0 0 176 176"
        >
            <PatternConnections selectedPoints={selectedPoints} markerId={markerId} />
            {PATTERN_COORDINATES.map((coordinate, index) => {
                const point = index + 1;
                const order = selectedPoints.indexOf(point);
                const selected = order >= 0;

                return (
                    <g key={point}>
                        <circle
                            cx={coordinate.x}
                            cy={coordinate.y}
                            r="18"
                            fill={selected ? "#fbbf24" : "#1e293b"}
                            stroke={selected ? "#fef3c7" : "#64748b"}
                            strokeWidth="3"
                        />
                        <text
                            x={coordinate.x}
                            y={coordinate.y + 5}
                            fill={selected ? "#020617" : "#cbd5e1"}
                            fontSize="14"
                            fontWeight="900"
                            textAnchor="middle"
                        >
                            {selected ? order + 1 : "·"}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

export function RepairPatternBoard({
    selectedPoints,
    isDrawing,
    onDrawingChange,
    onPointSelect,
}: RepairPatternBoardProps) {
    const markerId = `repair-pattern-board-${useId().replaceAll(":", "")}`;

    return (
        <div
            className="relative mx-auto h-[216px] w-[216px] touch-none rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-background/90 to-amber-950/30 p-5 shadow-inner shadow-black/35 sm:mx-0"
            onPointerUp={() => onDrawingChange(false)}
            onPointerCancel={() => onDrawingChange(false)}
            onPointerLeave={() => onDrawingChange(false)}
        >
            <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-5 top-5 h-44 w-44 overflow-visible"
                viewBox="0 0 176 176"
            >
                <PatternConnections selectedPoints={selectedPoints} markerId={markerId} />
            </svg>

            <div className="relative z-10 grid grid-cols-3 gap-[22px]">
                {PATTERN_COORDINATES.map((_, index) => {
                    const point = index + 1;
                    const order = selectedPoints.indexOf(point);
                    const selected = order >= 0;

                    return (
                        <button
                            key={point}
                            type="button"
                            aria-label={`Punto ${point}${selected ? `, posición ${order + 1}` : ""}`}
                            onPointerDown={(event) => {
                                event.preventDefault();
                                onDrawingChange(true);
                                onPointSelect(point);
                            }}
                            onPointerEnter={(event) => {
                                if (isDrawing && event.buttons === 1) onPointSelect(point);
                            }}
                            className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black transition-all duration-150",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                selected
                                    ? "scale-105 border-amber-100 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-400/35"
                                    : "border-amber-300/75 bg-amber-400/10 text-amber-200 ring-4 ring-amber-400/10 shadow-[inset_0_0_14px_rgba(251,191,36,0.08),0_0_12px_rgba(251,191,36,0.12)] hover:border-amber-200 hover:bg-amber-400/20 hover:ring-amber-300/20",
                            )}
                        >
                            {selected ? (
                                order + 1
                            ) : (
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.75)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
