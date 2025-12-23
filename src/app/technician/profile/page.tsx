import { getUserData } from "@/actions/get-user";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
    const user = await getUserData();

    if (!user) {
        return <div>Usuario no encontrado</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>
                <p className="text-muted-foreground">
                    Gestiona tu información personal y preferencias.
                </p>
            </div>

            <ProfileForm user={user} />
        </div>
    );
}
