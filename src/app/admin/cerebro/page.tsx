import { CerebroV2Shell } from "@/components/cerebro-v2/cerebro-v2-shell";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCerebroPage() {
    const user = await getUserData();
    if (!user) redirect("/login");

    return (
        <div className="-m-6 overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
            <CerebroV2Shell />
        </div>
    );
}
