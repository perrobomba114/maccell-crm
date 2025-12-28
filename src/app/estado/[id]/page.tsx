
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Smartphone,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Wrench,
    User,
    MapPin,
    Phone,
    Info,
    Loader2
} from "lucide-react";
import { RepairStatusBadge } from "@/components/repairs/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface RepairData {
    id: string;
    ticketNumber: string;
    createdAt: string;
    promisedAt: string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    diagnosis: string | null;
    statusId: number;
    branch: {
        name: string;
        address: string | null;
        phone: string | null;
        imageUrl: string | null;
    };
}

export default function RepairStatusPage({ params }: { params: any }) {
    const [id, setId] = useState<string | null>(null);
    const [repair, setRepair] = useState<RepairData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        params.then((p: any) => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (!id) return;

        async function fetchRepair() {
            try {
                const response = await fetch(`/api/public/repair-status?id=${id}`);
                if (!response.ok) throw new Error("Not found");
                const data = await response.json();
                setRepair(data);
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchRepair();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="mt-4 text-white/40 font-bold tracking-widest uppercase text-xs animate-pulse">Consultando Sistema...</p>
            </div>
        );
    }

    if (error || !repair) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
                <div className="bg-destructive/20 p-6 rounded-full mb-6 ring-4 ring-destructive/10 animate-pulse">
                    <AlertCircle className="w-16 h-16 text-destructive" />
                </div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Ticket no encontrado</h1>
                <p className="text-white/40 mt-4 max-w-xs font-medium leading-relaxed">
                    No pudimos localizar la reparación. Por favor, verificá el número en tu ticket impreso.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const statusMap: Record<number, { icon: any, color: string, description: string, step: number }> = {
        1: { icon: Clock, color: "text-blue-500", description: "Hemos recibido tu equipo y está a la espera de ser revisado por un técnico.", step: 1 },
        2: { icon: Wrench, color: "text-indigo-500", description: "Un técnico ya tiene tu equipo en su mesa de trabajo para el diagnóstico inicial.", step: 2 },
        3: { icon: Wrench, color: "text-yellow-500", description: "Estamos trabajando activamente en la reparación de tu dispositivo.", step: 2 },
        4: { icon: AlertCircle, color: "text-gray-500", description: "La reparación se encuentra pausada temporalmente.", step: 2 },
        7: { icon: Info, color: "text-purple-500", description: "El técnico ha finalizado el diagnóstico. Comunicate pronto o pasate por el local.", step: 3 },
        8: { icon: Clock, color: "text-orange-500", description: "Estamos aguardando tu confirmación del presupuesto para continuar.", step: 3 },
        9: { icon: Clock, color: "text-amber-500", description: "Estamos esperando que llegue el repuesto necesario para finalizar.", step: 3 },
        5: { icon: CheckCircle2, color: "text-green-500", description: "¡Buenas noticias! Tu equipo ha sido reparado con éxito y está listo para retirar.", step: 4 },
        6: { icon: AlertCircle, color: "text-red-500", description: "Lamentablemente el equipo no pudo ser reparado. Puedes pasar a retirarlo.", step: 4 },
        10: { icon: CheckCircle2, color: "text-slate-500", description: "El equipo ya fue entregado. ¡Gracias por confiar en nosotros!", step: 4 },
    };

    const statusInfo = statusMap[repair.statusId] || { icon: Info, color: "text-gray-500", description: "Estado en actualización.", step: 1 };
    const StatusIcon = statusInfo.icon;

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-primary selection:text-white">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full opacity-40" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full opacity-30" />
                <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-purple-600/5 blur-[120px] rounded-full opacity-20" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 space-y-12">

                {/* LOGO SECTION - ENLARGED */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center space-y-8"
                >
                    {repair.branch.imageUrl ? (
                        <div className="relative w-80 h-36 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <Image
                                src={repair.branch.imageUrl}
                                alt={repair.branch.name}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    ) : (
                        <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
                            {repair.branch.name}
                        </h1>
                    )}

                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-white/80">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span>{repair.branch.address || "Sucursal Central"}</span>
                        </div>
                        {repair.branch.phone && (
                            <div className="flex items-center gap-2 text-base md:text-lg font-medium text-white/50">
                                <Phone className="w-4 h-4 text-primary/70" />
                                <span>{repair.branch.phone}</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* MAIN CONTENT CARD */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                >
                    <Card className="bg-white/[0.03] border-white/10 backdrop-blur-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)] overflow-hidden rounded-[3rem] border-t-white/20">
                        <div className="p-1.5 px-8 pt-4">
                            <div className={`h-2 w-full rounded-full ${statusInfo.color.replace('text-', 'bg-')} opacity-40 blur-[1px]`} />
                        </div>

                        <CardHeader className="pt-8 pb-4 px-10">
                            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 text-center md:text-left">
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black tracking-tighter text-white">
                                        #{repair.ticketNumber}
                                    </h2>
                                    <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center md:justify-start">
                                        <Clock className="w-3 h-3 mr-2 text-primary" /> Ingreso: {format(new Date(repair.createdAt), "d 'de' MMMM", { locale: es })}
                                    </p>
                                </div>
                                <RepairStatusBadge statusId={repair.statusId} className="text-xs font-black px-6 py-3 rounded-full uppercase tracking-widest ring-8 ring-white/[0.03] shadow-2xl scale-110 md:scale-100" />
                            </div>
                        </CardHeader>

                        <CardContent className="px-10 pb-12 space-y-12">

                            {/* PROGRESS TRACKER */}
                            <div className="py-4 space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    {[1, 2, 3, 4].map((s) => (
                                        <div key={s} className="relative flex flex-col items-center">
                                            <div className={`w-4 h-4 rounded-full transition-all duration-1000 z-10 ${s <= statusInfo.step ? statusInfo.color.replace('text-', 'bg-') + ' scale-125 shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]' : 'bg-white/10'}`} />
                                            {s < 4 && (
                                                <div className={`absolute left-4 w-[calc(100vw/6)] h-0.5 mt-2 -z-0 opacity-20 ${s < statusInfo.step ? statusInfo.color.replace('text-', 'bg-') : 'bg-white/10'}`} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${statusInfo.color.replace('text-', 'bg-')} shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(statusInfo.step / 4) * 100}%` }}
                                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                </div>
                            </div>

                            {/* STATUS HERO SECTION */}
                            <motion.div
                                className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-br from-white/[0.06] to-transparent border border-white/10 shadow-inner"
                                whileHover={{ y: -5, scale: 1.01 }}
                            >
                                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
                                    <div className={`p-5 rounded-[1.5rem] bg-black/50 border border-white/10 flex-shrink-0 shadow-2xl ${statusInfo.color} ring-4 ring-white/5`}>
                                        <StatusIcon className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-2 py-1">
                                        <h3 className="font-black text-2xl text-white tracking-tight italic">Estado del Servicio</h3>
                                        <p className="text-white/60 text-base leading-relaxed font-medium max-w-sm">
                                            {statusInfo.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* CENTERED INFO GRID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <motion.div
                                    className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-4 text-center group transition-colors hover:bg-white/[0.05]"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="flex justify-center">
                                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                            <Smartphone className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">Dispositivo</p>
                                        <p className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{repair.deviceBrand}</p>
                                        <p className="text-sm font-bold text-white/40 uppercase mt-1">{repair.deviceModel}</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-4 text-center group transition-colors hover:bg-white/[0.05]"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="flex justify-center">
                                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black tracking-[0.3em] text-white/20 uppercase">Estimado</p>
                                        <p className="text-2xl font-black text-white tracking-tighter leading-none">{format(new Date(repair.promisedAt), "dd/MM")}</p>
                                        <p className="text-sm font-black text-primary italic mt-1">{format(new Date(repair.promisedAt), "HH:mm")} hs</p>
                                    </div>
                                </motion.div>
                            </div>

                            <Separator className="bg-white/5" />

                            {/* IMPROVED FALLA REPORTADA SECTION */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10 hidden md:block" />
                                        <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-white/30 uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                            <User className="w-3 h-3 text-primary" /> Falla Reportada
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                        <div className="relative p-8 rounded-[2rem] bg-black/40 text-white/90 border border-white/10 font-bold italic leading-relaxed text-lg text-center shadow-2xl overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                            <span className="relative z-10">"{repair.problemDescription}"</span>
                                        </div>
                                    </div>
                                </div>

                                {repair.diagnosis && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center justify-center md:justify-start gap-4">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/20 hidden md:block" />
                                            <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-primary uppercase bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                                                <Wrench className="w-3 h-3" /> Diagnóstico Técnico
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/20" />
                                        </div>
                                        <div className="p-8 rounded-[2.5rem] bg-primary/[0.08] border border-primary/20 text-primary-foreground font-black shadow-[0_20px_40px_rgba(var(--primary-rgb),0.15)] text-lg text-center ring-1 ring-primary/30">
                                            {repair.diagnosis}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* DONE MESSAGE - PREMIUM POD */}
                            {(repair.statusId === 5 || repair.statusId === 6) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative group p-1"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-[3rem] blur opacity-30 animate-pulse" />
                                    <div className="relative p-10 rounded-[2.5rem] bg-gradient-to-br from-green-500 to-emerald-600 text-white text-center shadow-2xl">
                                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 drop-shadow-xl" />
                                        <p className="font-black text-3xl tracking-tighter italic">¡EQUIPO LISTO!</p>
                                        <p className="text-lg font-bold opacity-90 mt-2">Ya podés retirarlo por nuestra sucursal.</p>
                                        <div className="mt-6 inline-flex px-6 py-2 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md">
                                            Te esperamos
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* BOTTOM BRANDING - MINIMALIST */}
                <div className="flex flex-col items-center gap-8 pt-8 text-center">
                    <div className="flex items-center gap-4 py-2 px-6 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md transition-all hover:border-white/20">
                        <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">
                            Maccell Secure System
                        </p>
                    </div>
                    <div className="flex gap-6 opacity-30 hover:opacity-100 transition-all duration-500">
                        <Smartphone className="w-5 h-5 text-white" />
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <Info className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}

