"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateSparePartsPrices } from "@/actions/spare-parts";

interface DolarResponse {
    compra: number;
    venta: number;
    casa: string;
    nombre: string;
    moneda: string;
    fechaActualizacion: string;
}

export function DollarWidget() {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const updateSystemPrices = async (newRate: number) => {
        try {
            await updateSparePartsPrices(newRate);
            toast.success("Precios de repuestos actualizados");
        } catch (err) {
            console.error("Failed to sync prices:", err);
            toast.error("Error al sincronizar precios de repuestos");
        }
    };

    const fetchDolar = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch("https://dolarapi.com/v1/dolares/oficial");
            if (!res.ok) throw new Error("Failed to fetch");
            const data: DolarResponse = await res.json();

            setRate(data.venta);
            setLastUpdated(new Date());

            // Trigger backend update
            updateSystemPrices(data.venta);

        } catch (err) {
            console.error("Error fetching dollar rate:", err);
            setError(true);
            toast.error("Error al actualizar cotización del dólar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDolar();

        // Refresh every 1 hour
        const interval = setInterval(fetchDolar, 1000 * 60 * 60);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-center gap-1.5">
                <div className="bg-emerald-100 text-emerald-700 p-1 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Dólar Oficial
                    </span>
                    <div className="flex items-center gap-1">
                        {loading && !rate ? (
                            <Skeleton className="h-5 w-16" />
                        ) : error ? (
                            <span className="text-sm font-semibold text-destructive">Error</span>
                        ) : (
                            <span className="text-sm font-bold text-foreground">
                                ${rate?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 ml-1", loading && "animate-spin")}
                onClick={fetchDolar}
                disabled={loading}
                title="Actualizar cotización"
            >
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
            </Button>
        </div>
    );
}
