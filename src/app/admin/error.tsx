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
        console.error("Admin Section Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 border border-red-500/20 rounded-md bg-red-500/10 text-red-600">
            <h2 className="text-xl font-bold">Error en la administración</h2>
            <p className="text-sm">{error.message}</p>
            <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                onClick={() => reset()}
            >
                Reintentar
            </button>
        </div>
    );
}
