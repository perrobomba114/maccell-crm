"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
        <html>
            <body style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Algo salió mal en la aplicación.</h2>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>{error.message}</p>
                    <button
                        style={{ padding: '10px 20px', background: '#000', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        onClick={() => reset()}
                    >
                        Reiniciar
                    </button>
                    {error.digest && <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>Digest: {error.digest}</p>}
                </div>
            </body>
        </html>
    );
}
