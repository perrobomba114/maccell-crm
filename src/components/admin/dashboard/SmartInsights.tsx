"use client";

import React, { useState } from "react";
import { Lightbulb, X, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmartInsightsProps {
    stats: any;
}

export function SmartInsights({ stats }: SmartInsightsProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    // derived insights
    const insights = [];

    // 1. Revenue Spike
    if (stats.financials.salesGrowth > 15) {
        insights.push({
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            title: "Crecimiento Explosivo",
            message: `Tus ingresos subieron un ${stats.financials.salesGrowth.toFixed(1)}% respecto al mes pasado. ¡Excelente trabajo!`
        });
    }

    // 2. High Profit Margin
    if (stats.financials.profitMargin > 30) {
        insights.push({
            icon: DollarSign,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            title: "Alta Rentabilidad",
            message: `Tu margen de ganancia neto es saludable (${stats.financials.profitMargin.toFixed(1)}%).`
        });
    }

    // 3. Stock Critical
    if (stats.stock.criticalCount > 5) {
        insights.push({
            icon: AlertTriangle,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20",
            title: "Atención al Stock",
            message: `Tienes ${stats.stock.criticalCount} productos con stock crítico. Revisa la tabla de reposición.`
        });
    }

    // Fallback insight
    if (insights.length === 0) {
        insights.push({
            icon: Lightbulb,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
            border: "border-violet-500/20",
            title: "Tip del día",
            message: "Revisa los reportes de técnicos para optimizar los tiempos de reparación."
        });
    }

    // Select the most important one (first one for now)
    const activeInsight = insights[0];
    const Icon = activeInsight.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
            >
                <div className={cn(
                    "relative p-4 rounded-2xl border flex items-start gap-4",
                    activeInsight.bg,
                    activeInsight.border
                )}>
                    <div className={cn("p-2 rounded-xl bg-white/5", activeInsight.color)}>
                        <Icon size={20} />
                    </div>

                    <div className="flex-1 pt-1">
                        <h4 className={cn("font-bold text-sm mb-1", activeInsight.color)}>
                            {activeInsight.title}
                        </h4>
                        <p className="text-sm text-zinc-300">
                            {activeInsight.message}
                        </p>
                    </div>

                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
