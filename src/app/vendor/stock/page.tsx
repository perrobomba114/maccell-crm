
import { getVendorStockAction } from "@/actions/stock";
import { getUserData } from "@/actions/get-user";
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

    const { data, totalPages, currentPage, total: totalItems } = await getVendorStockAction({ page, query });

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Consulta de Stock</h1>
            </div>

            <VendorStockTable
                data={data}
                totalPages={totalPages}
                currentPage={currentPage}
                totalItems={totalItems}
                userBranchName={user.branch?.name || ""}
            />
        </div>
    );
}
