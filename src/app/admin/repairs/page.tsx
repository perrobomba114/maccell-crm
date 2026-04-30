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

export default async function AdminRepairsPage(
    props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
    const searchParams = await props.searchParams;
    const query = typeof searchParams?.q === 'string' ? searchParams.q : "";
    const branchId = typeof searchParams?.branch === "string" ? searchParams.branch : "ALL";
    const technician = typeof searchParams?.tech === "string" ? searchParams.tech : "";
    const date = typeof searchParams?.date === "string" ? searchParams.date : "";
    const page = typeof searchParams?.page === "string" ? Number(searchParams.page) : 1;
    const warrantyOnly = searchParams?.warranty === "1";

    const user = await getUserData();
    if (!user || user.role !== "ADMIN") redirect("/");

    const [repairsData, branches] = await Promise.all([
        getAllRepairsForAdminAction({ query, branchId, technician, date, page, warrantyOnly }),
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
                    <AdminRepairsTable repairsData={repairsData} branches={branches} />
                </CardContent>
            </Card>
        </div>
    );
}
