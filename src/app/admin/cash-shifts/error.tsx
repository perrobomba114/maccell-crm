"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-bold text-foreground">Algo salió mal cargando los cierres de caja.</h2>
            <p className="text-muted-foreground">{error.message || "Error desconocido"}</p>
            <Button onClick={() => reset()}>Intentar de nuevo</Button>
        </div>
    );
}
