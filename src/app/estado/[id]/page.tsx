
import { db } from "@/lib/db";
import { RepairStatusView } from "@/components/repairs/repair-status-view";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: {
        id: string;
    }
}

async function getRepair(id: string) {
    const cleanId = id.trim();
    let repair = null;

    // Direct Index Lookup Optimization
    if (cleanId.length >= 20 && !cleanId.includes("MAC")) {
        repair = await db.repair.findUnique({
            where: { id: cleanId },
            include: {
                branch: {
                    select: {
                        name: true,
                        address: true,
                        phone: true,
                        imageUrl: true,
                    }
                },
                status: true,
            }
        });
    }

    if (!repair) {
        repair = await db.repair.findUnique({
            where: { ticketNumber: cleanId },
            include: {
                branch: {
                    select: {
                        name: true,
                        address: true,
                        phone: true,
                        imageUrl: true,
                    }
                },
                status: true,
            }
        });
    }

    return repair;
}

export default async function RepairStatusPage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15+ Params are promises
    const { id } = await params;

    // Server-Side Data Fetching
    const repair = await getRepair(id);

    if (!repair) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
                <div className="bg-destructive/20 p-6 rounded-full mb-6 ring-4 ring-destructive/10 animate-pulse">
                    <AlertCircle className="w-16 h-16 text-destructive" />
                </div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Ticket no encontrado</h1>
                <p className="text-white/40 mt-4 max-w-xs font-medium leading-relaxed">
                    No pudimos localizar la reparación. Por favor, verificá el número en tu ticket impreso.
                </p>
                <Link
                    href="/"
                    className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all font-sans"
                >
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    return <RepairStatusView repair={repair as any} />;
}
