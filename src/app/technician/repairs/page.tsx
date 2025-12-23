import { getUserData } from "@/actions/get-user";
import { getActiveRepairsAction } from "@/lib/actions/repairs";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TechnicianRepairsPage() {
    const user = await getUserData();
    if (!user || user.role !== "TECHNICIAN") redirect("/");

    console.log("TechnicianRepairsPage loading for:", user.email, "Branch:", user.branch?.id);

    // Filter by statuses: 2, 3, 4, 7, 8, 9
    // And ensure assigned to current user!
    const allRepairs = await getActiveRepairsAction(user.branch?.id || "", [2, 3, 4, 8, 9]);
    const repairs = allRepairs.filter((r: any) =>
        r.assignedUserId === user.id ||
        (r.statusId === 2 && !r.assignedUserId) // Show unassigned Status 2 repairs
    );

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Reparaciones en Curso</h2>
            <div className="bg-card rounded-lg shadow p-4">
                <ActiveRepairsTable
                    repairs={repairs}
                    currentUserId={user.id}
                    enableTakeover={false}
                    enableManagement={true}
                />
            </div>
        </div>
    );
}
