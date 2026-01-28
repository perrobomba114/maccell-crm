import { getUserData } from "@/actions/get-user";
import { getAllNotificationsAction } from "@/lib/actions/notifications";
import { redirect } from "next/navigation";
import { AdminNotificationsClient } from "@/components/admin/notifications-client";

export default async function AdminNotificationsPage({
    searchParams
}: {
    searchParams: { status?: string; type?: string };
}) {
    const user = await getUserData();
    if (!user || user.role !== "ADMIN") {
        redirect("/");
    }

    const { status, type } = await searchParams;

    const notifications = await getAllNotificationsAction(user.id, {
        status: status || 'ALL',
        type: type || 'ALL'
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Centro de Notificaciones</h1>
                <p className="text-muted-foreground">
                    Administra las solicitudes y alertas del sistema.
                </p>
            </div>

            <AdminNotificationsClient initialNotifications={notifications} />
        </div>
    );
}
