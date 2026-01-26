import { getUserData } from "@/actions/get-user";
import { getAllRepairsForAdminAction } from "@/lib/actions/repairs";
import { getAllBranches } from "@/actions/get-branches";
import { AdminRepairsTable } from "@/components/repairs/admin-repairs-table";
import { TechnicianStatsCards } from "@/components/repairs/technician-stats-cards";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gestión de Reparaciones | MACCELL",
    description: "Panel de administración para la gestión centralizada de reparaciones técnicas.",
};

export const dynamic = "force-dynamic";

export default async function AdminRepairsPage() {
    const user = await getUserData();
    if (!user || user.role !== "ADMIN") redirect("/");

    const [repairs, branches] = await Promise.all([
        getAllRepairsForAdminAction(),
        getAllBranches()
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Reparaciones</h2>
                <Link href="/admin/repairs/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Reparación
                    </Button>
                </Link>
            </div>

            {/* Performance Cards */}
            <TechnicianStatsCards />

            <Card>
                <CardHeader>
                    <CardTitle>Todas las Reparaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <AdminRepairsTable repairs={repairs} branches={branches} />
                </CardContent>
            </Card>
        </div>
    );
}
