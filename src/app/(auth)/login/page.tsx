import type { Metadata } from "next";
import { LoginCard } from "./_components/login-card";

export const metadata: Metadata = {
    title: "Iniciar Sesión - Maccell CRM",
    description: "Accede al sistema de gestión empresarial Maccell. Ingresa con tus credenciales para administrar tu sucursal, ventas y servicios técnicos.",
};

export default function LoginPage() {
    return (
        <div className="w-full max-w-md">
            <LoginCard />
        </div>
    );
}
