
import { getVendorStockAction } from "@/actions/stock";
import { getUserData } from "@/actions/get-user";
import { Suspense } from "react";
import { VendorStockSearch } from "@/components/stock/vendor-stock-search";
import { VendorStockTable } from "@/components/stock/vendor-stock-table";
import { redirect } from "next/navigation";
import { Box } from "lucide-react";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function VendorStockPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const user = await getUserData();

    if (!user || (user.role !== "VENDOR" && user.role !== "TECHNICIAN")) {
        redirect("/login");
    }

    const page = Number(searchParams.page) || 1;
    const query = searchParams.query || "";

    const { data, totalPages, currentPage, total } = await getVendorStockAction({ page, query });

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <Box className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Consulta de Stock</h2>
                            <p className="text-sm text-muted-foreground">
                                Verificá la disponibilidad de productos y repuestos en tiempo real.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                    <VendorStockSearch />

                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><p className="text-muted-foreground">Cargando stock...</p></div>}>
                        <VendorStockTable
                            data={data}
                            totalItems={total}
                            totalPages={totalPages}
                            currentPage={currentPage}
                            userBranchName={user?.branch?.name || ""}
                        />
                    </Suspense>
                </div>
            </section>
        </div>
    );
}
