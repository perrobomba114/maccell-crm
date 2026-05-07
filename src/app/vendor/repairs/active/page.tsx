
import { getActiveRepairsAction } from "@/lib/actions/repairs";
import { getUserData } from "@/actions/get-user";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";

export default async function ActiveRepairsPage() {
    const user = await getUserData();

    if (!user || user.role !== "VENDOR") {
        redirect("/login");
    }

    if (!user.branch) {
        return <div>Error: Usuario sin sucursal asignada.</div>;
    }

    const repairs = await getActiveRepairsAction(user.branch.id);

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <Wrench className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Reparaciones Activas</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestiona los equipos que están actualmente en proceso de reparación.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-0 sm:p-6">
                    <ActiveRepairsTable repairs={repairs} enableImageUpload={true} />
                </div>
            </section>
        </div>
    );
}
