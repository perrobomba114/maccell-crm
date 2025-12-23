
import { getUserData } from "@/actions/get-user";
import { getRepairByIdAction, getAllStatusesAction, getAllTechniciansAction } from "@/lib/actions/repairs";
import { EditRepairForm } from "@/components/repairs/edit-form";
import { redirect } from "next/navigation";

interface EditRepairPageProps {
    params: Promise<{
        repairId: string;
    }>;
}

export default async function EditRepairPage({ params }: EditRepairPageProps) {
    const user = await getUserData();
    if (!user || user.role !== "ADMIN") redirect("/");

    const { repairId } = await params;
    const repair = await getRepairByIdAction(repairId);
    const statuses = await getAllStatusesAction();
    const technicians = await getAllTechniciansAction();

    if (!repair) {
        return <div className="p-8">Reparación no encontrada.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Editar Reparación #{repair.ticketNumber}</h2>
            </div>

            <div className="bg-card rounded-lg shadow-sm border p-6">
                <EditRepairForm
                    repair={repair}
                    statuses={statuses}
                    technicians={technicians}
                    userId={user.id}
                    redirectPath="/admin/repairs"
                />
            </div>
        </div>
    );
}
