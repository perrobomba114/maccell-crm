"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Building2, Clock, Wrench } from "lucide-react";

interface BranchPerformanceCardsProps {
    data: { name: string; totalRepairs: number; avgTimeMinutes: number }[];
}

export function BranchPerformanceCards({ data }: BranchPerformanceCardsProps) {
    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Gradient definitions to cycle through for branches
    const gradients = [
        "from-emerald-500 to-emerald-700",
        "from-blue-500 to-indigo-600",
        "from-amber-400 to-orange-600",
        "from-purple-500 to-pink-600",
        "from-cyan-500 to-cyan-700",
        "from-rose-500 to-rose-700"
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((branch, index) => {
                const gradient = gradients[index % gradients.length];
                const bgClass = `bg-gradient-to-br ${gradient}`;

                return (
                    <Card key={index} className={`relative overflow-hidden border-none shadow-lg text-white ${bgClass}`}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-white/80 font-medium text-sm mb-1 uppercase tracking-wider">Sucursal</p>
                                    <h3 className="text-2xl font-bold truncate max-w-[180px]" title={branch.name}>{branch.name}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-4">
                                {/* Volume Metric */}
                                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex-1">
                                    <Wrench className="h-4 w-4 text-white/80" />
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase font-bold">Volumen</p>
                                        <p className="font-bold text-lg leading-none">{branch.totalRepairs}</p>
                                    </div>
                                </div>

                                {/* Speed Metric */}
                                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm flex-1">
                                    <Clock className="h-4 w-4 text-white/80" />
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase font-bold">Promedio</p>
                                        <p className="font-bold text-lg leading-none">{formatTime(branch.avgTimeMinutes)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        {/* Decorative circles to match KPIGrid */}
                        <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="absolute -bottom-10 -left-10 h-24 w-24 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
                    </Card>
                );
            })}

            {data.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    Sin datos de sucursales disponibles.
                </div>
            )}
        </div>
    );
}
