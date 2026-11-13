import { CerebroV2Shell } from "@/components/cerebro-v2/cerebro-v2-shell";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCerebroPage({ searchParams }: { searchParams: Promise<{ repairId?: string }> }) {
    const user = await getUserData();
    if (!user) redirect("/login");

    return (
        <div className="-mx-3 h-[calc(100dvh-4.75rem)] overflow-hidden md:-m-6 md:h-[calc(100dvh-4rem)]">
            <CerebroV2Shell initialRepairId={(await searchParams).repairId} />
        </div>
    );
}
