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
        console.error("Technician Area Error:", error);
    }, [error]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-bold">Algo salió mal en el área de técnicos.</h2>
            <div className="bg-destructive/10 p-4 rounded-md text-destructive max-w-md overflow-auto">
                <p className="font-mono text-sm">{error.message}</p>
                {error.digest && <p className="text-xs text-muted-foreground mt-2">Digest: {error.digest}</p>}
            </div>
            <Button onClick={() => reset()}>Intentar de nuevo</Button>
        </div>
    );
}
