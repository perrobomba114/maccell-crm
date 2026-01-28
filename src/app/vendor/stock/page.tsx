
import { getVendorStockAction } from "@/actions/stock";
import { getUserData } from "@/actions/get-user";
import { Suspense } from "react";
import { VendorStockSearch } from "@/components/stock/vendor-stock-search";
import { VendorStockTable } from "@/components/stock/vendor-stock-table";
import { redirect } from "next/navigation";

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
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Consulta de Stock</h1>
            </div>
            {/* Client Search Component that updates URL but doesn't block UI */}
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
    );
}
