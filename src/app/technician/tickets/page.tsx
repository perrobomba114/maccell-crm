
import { db } from "@/lib/db";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AvailableWorkPage() {
    const user = await getUserData();

    if (!user || user.role !== "TECHNICIAN") {
        redirect("/");
    }

    // Fetch repairs with statusId = 1 (Pending/Ingresado usually)
    // Ordered by promise date (closest first)
    const repairs = await db.repair.findMany({
        where: {
            statusId: 1,
            branchId: user?.branch?.id || undefined,
        },
        include: {
            customer: true,
            status: true,
            assignedTo: true,
        },
        orderBy: {
            promisedAt: "asc",
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Trabajo Disponible</h1>

                </div>
            </div>

            <ActiveRepairsTable
                repairs={repairs}
                emptyMessage="No hay trabajo disponible en este momento."
                enableTakeover={true}
                currentUserId={user?.id}
            />
        </div>
    );
}
