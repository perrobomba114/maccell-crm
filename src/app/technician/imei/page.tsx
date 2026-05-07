import { ImeiChecker } from "@/components/imei/imei-checker";
import { ShieldCheck } from "lucide-react";

export default function TechnicianImeiPage() {
    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Consulta de IMEI</h2>
                            <p className="text-sm text-muted-foreground">
                                Verificá el estado legal de un equipo en la base de datos de ENACOM.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-5 sm:p-6">
                    <ImeiChecker />
                </div>
            </section>
        </div>
    );
}
