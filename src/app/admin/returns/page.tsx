import { getReturnRequests } from "@/actions/return-actions";
import { getUserData } from "@/actions/get-user";
import AdminReturnsClient from "./returns-client";

export default async function AdminReturnsPage() {
    const user = await getUserData();
    if (!user) return <div>No autorizado</div>;

    const result = await getReturnRequests("ADMIN");
    const returns = result.success ? result.data : [];

    return <AdminReturnsClient returns={returns as any} adminId={user.id} />;
}
