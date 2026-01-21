import { listBackups } from "@/actions/backup";
import { BackupClient } from "@/components/admin/backups/backup-client";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export default async function BackupsPage() {
    const user = await getUserData();

    if (!user || user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const res = await listBackups();

    // Ensure serializable data for Client Component
    const backups = (res.backups || []).map(b => ({
        ...b,
        createdAt: b.createdAt.toISOString() // Pass as string
    }));

    return (
        <div className="container mx-auto py-6">
            <BackupClient
                initialBackups={backups.map(b => ({ ...b, createdAt: new Date(b.createdAt) }))}
            />
        </div>
    );
}
