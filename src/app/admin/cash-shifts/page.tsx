import { AdminCashDashboard } from "@/components/admin/cash-dashboard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CashShiftsPage() {
    let branches: any[] = [];
    try {
        branches = await db.branch.findMany({
            orderBy: { name: 'asc' }
        });
    } catch (e) {
        console.error("Error fetching branches:", e);
        // Fallback or rethrow handled by error.tsx
    }

    return (
        <div className="p-6 md:p-8 space-y-8 w-full max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Cierre de Caja
                </h1>
                <p className="text-muted-foreground text-lg">
                    Panel de control mensual de movimientos y cierres de caja.
                </p>
            </div>

            <AdminCashDashboard initialBranches={branches} />
        </div>
    );
}
