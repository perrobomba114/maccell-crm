import { getUserData } from "@/actions/get-user";
import { getAllNotificationsAction } from "@/lib/actions/notifications";
import { redirect } from "next/navigation";
import { AdminNotificationsClient } from "../../../components/admin/notifications-client";

export default async function AdminNotificationsPage({
    searchParams
}: {
    searchParams: { status?: string; type?: string; page?: string };
}) {
    const user = await getUserData();
    if (!user || user.role !== "ADMIN") {
        redirect("/");
    }

    const { status, type, page: pageParam } = await searchParams;
    const page = Number(pageParam) || 1;

    const { notifications, totalPages, total } = await getAllNotificationsAction(
        user.id,
        { status: status || 'ALL', type: type || 'ALL' },
        page,
        25 // limit
    );

    return (
        <div className="h-full w-full space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Centro de Notificaciones
                </h1>
                <p className="text-muted-foreground text-lg">
                    Administra solicitudes, alertas y eventos del sistema en tiempo real.
                </p>
            </div>

            <AdminNotificationsClient
                initialNotifications={notifications}
                totalPages={totalPages}
                currentPage={page}
                totalItems={total}
            />
        </div>
    );
}
