import { getAllUsers } from "@/actions/user-actions";
import { getAllBranches } from "@/actions/branch-actions";
import { UsersTable } from "./_components/users-table";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
    const [usersResult, branchesResult] = await Promise.all([
        getAllUsers(),
        getAllBranches(),
    ]);

    const users = usersResult.success ? usersResult.users : [];
    const branches = branchesResult.success ? branchesResult.branches : [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                <p className="text-muted-foreground">
                    Administra los usuarios del sistema y sus permisos
                </p>
                {!usersResult.success && (
                    <div className="bg-red-500/10 text-red-500 p-3 mt-4 rounded-md border border-red-500/20 text-sm font-semibold tracking-tight">
                        Error al cargar usuarios desde la base de datos: {usersResult.error}
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <UsersTable users={users || []} branches={branches || []} />
                </CardContent>
            </Card>
        </div>
    );
}
