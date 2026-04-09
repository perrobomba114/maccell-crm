import { CerebroLayout } from "@/components/cerebro/cerebro-layout";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCerebroPage() {
    const user = await getUserData();
    if (!user) redirect("/login");

    return (
        <div className="-m-6 overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
            <CerebroLayout userId={user.id} isAdmin={true} />
        </div>
    );
}
