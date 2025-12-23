import { getAllBranches } from "@/actions/branch-actions";
import { BranchesTable } from "./_components/branches-table";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminBranchesPage() {
    const result = await getAllBranches();
    const branches = result.success ? result.branches : [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Sucursales</h2>
                <p className="text-muted-foreground">
                    Administra las sucursales de la empresa
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <BranchesTable branches={branches || []} />
                </CardContent>
            </Card>
        </div>
    );
}
