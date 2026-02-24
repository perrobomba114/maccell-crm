import { CerebroLayout } from "@/components/cerebro/cerebro-layout";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { BrainCircuit } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorCerebroPage() {
    const user = await getUserData();
    if (!user) redirect("/login");

    return (
        <div className="-m-6 flex flex-col overflow-hidden bg-zinc-950" style={{ height: 'calc(100vh - 4rem)' }}>
            <div className="shrink-0 p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6 text-violet-500" />
                        Cerebro AI
                    </h2>
                    <p className="text-[10px] md:text-xs text-zinc-500 line-clamp-1">Asistente experto en diagnóstico y gestión comercial</p>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden relative">
                <CerebroLayout userId={user.id} />
            </div>
        </div>
    );
}
