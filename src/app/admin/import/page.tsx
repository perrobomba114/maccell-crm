import { AdminImportData } from "@/components/admin/import-data";
import { db } from "@/lib/db";

export default async function ImportPage() {
    const branches = await db.branch.findMany({ select: { id: true, name: true } });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">
                    Importación de Histórico
                </h1>
                <p className="text-muted-foreground">
                    Carga los datos de ventas de años anteriores para completar tus estadísticas y KPIs.
                </p>
            </div>

            <AdminImportData branches={branches} />
        </div>
    );
}
