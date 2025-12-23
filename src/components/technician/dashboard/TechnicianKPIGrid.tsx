import { Card, CardContent } from "@/components/ui/card";
import { ListTodo, PlayCircle, CheckCircle, Timer } from "lucide-react";

interface TechnicianKPIGridProps {
    stats: {
        pendingTickets: number;
        activeRepairs: number;
        completedToday: number;
        avgRepairTime: string;
    }
}

export function TechnicianKPIGrid({ stats }: TechnicianKPIGridProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* EN MESA (FOCUS) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 font-medium text-sm mb-1">En Mesa</p>
                            <h3 className="text-4xl font-extrabold">{stats.activeRepairs}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm animate-pulse">
                            <PlayCircle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-blue-100 text-xs">Equipos procesándose ahora</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* PENDIENTES (TO DO) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-orange-100 font-medium text-sm mb-1">En Cola</p>
                            <h3 className="text-4xl font-extrabold">{stats.pendingTickets}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <ListTodo className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-orange-100 text-xs">Tickets asignados pendientes</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* COMPLETADOS HOY (SUCCESS) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm mb-1">Listos Hoy</p>
                            <h3 className="text-3xl font-bold">{stats.completedToday}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-emerald-100 text-xs text-center">¡Gran trabajo hoy!</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

            {/* TIEMPO PROMEDIO (EFFICIENCY) */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 font-medium text-sm mb-1">Ritmo</p>
                            <h3 className="text-3xl font-bold">{stats.avgRepairTime}</h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Timer className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <span className="text-purple-100 text-xs">Tiempo promedio reparación</span>
                    </div>
                </CardContent>
                <div className="absolute -top-12 -right-12 h-32 w-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </Card>

        </div>
    );
}
