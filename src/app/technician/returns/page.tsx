import { getReturnRequests } from "@/actions/return-actions";
import { getUserData } from "@/actions/get-user";
import TechnicianReturnsClient from "./returns-client";

export default async function TechnicianReturnsPage() {
    const user = await getUserData();
    if (!user) return <div>No autorizado</div>;

    const result = await getReturnRequests("TECHNICIAN", user.id);
    const returns = result.success ? result.data : [];

    return <TechnicianReturnsClient returns={returns as any} />;
}
