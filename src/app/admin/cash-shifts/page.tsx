import { getCashShifts } from "@/actions/cash-shift-actions";
import { CashShiftTable } from "@/components/admin/cash-shift-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic"; // Ensure real-time data

export default async function CashShiftsPage() {
    // Fetch all shifts sorted by date desc
    const shifts = await getCashShifts();

    return (
        <div className="p-6 md:p-8 space-y-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Cierres de Caja
                </h1>
                <p className="text-muted-foreground text-lg">
                    Supervisa y audita los movimientos de caja de todas las sucursales.
                </p>
            </div>

            <div className="grid gap-6">
                <CashShiftTable shifts={shifts} />
            </div>
        </div>
    );
}
