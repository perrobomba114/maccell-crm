"use client";

import { useEffect, useState, use } from "react";
import { RepairStatusView } from "@/components/repairs/repair-status-view";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface RepairData {
    id: string;
    ticketNumber: string;
    createdAt: Date | string;
    promisedAt: Date | string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    diagnosis: string | null;
    statusId: number;
    branch: {
        name: string;
        address: string | null;
        phone: string | null;
        imageUrl: string | null;
    };
    isWet?: boolean;
}

export default function RepairStatusPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use() or await in async wrapper, but this is a client component
    // In Next.js 15, params is a promise.
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [repair, setRepair] = useState<RepairData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!id) return;

        async function fetchRepair() {
            try {
                const response = await fetch(`/api/public/repair-status?id=${id}`);
                if (!response.ok) throw new Error("Not found");
                const data = await response.json();
                setRepair(data);
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchRepair();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="mt-4 text-white/40 font-bold tracking-widest uppercase text-xs animate-pulse">Consultando Sistema...</p>
            </div>
        );
    }

    if (error || !repair) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
                <div className="bg-destructive/20 p-6 rounded-full mb-6 ring-4 ring-destructive/10 animate-pulse">
                    <AlertCircle className="w-16 h-16 text-destructive" />
                </div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Ticket no encontrado</h1>
                <p className="text-white/40 mt-4 max-w-xs font-medium leading-relaxed">
                    No pudimos localizar la reparación. Por favor, verificá el número en tu ticket impreso.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return <RepairStatusView repair={repair} />;
}
