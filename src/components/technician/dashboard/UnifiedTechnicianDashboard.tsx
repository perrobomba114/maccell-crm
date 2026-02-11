"use client";

import {
    Wrench,
    ListTodo,
    CheckCircle2,
    Timer,
    PlayCircle,
    Smartphone,
    User,
    Calendar,
    Clock,
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    ShieldCheck,
    CalendarCheck,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WeeklyOutputChart, MyStatusPieChart } from "./TechnicianCharts";

// --- Standard Metrics Component ---
function TechMetric({ title, value, icon: Icon, color, subtext, href }: any) {
    const strategies: any = {
        violet: { bg: "bg-violet-600", text: "text-white", icon: "bg-violet-500", border: "border-violet-400" },
        blue: { bg: "bg-blue-600", text: "text-white", icon: "bg-blue-500", border: "border-blue-400" },
        emerald: { bg: "bg-emerald-600", text: "text-white", icon: "bg-emerald-500", border: "border-emerald-400" },
        orange: { bg: "bg-orange-600", text: "text-white", icon: "bg-orange-500", border: "border-orange-400" },
    };

    const style = strategies[color] || strategies.blue;

    return (
        <Link href={href || "#"} className={cn(
            "group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden border-2 shadow-lg",
            style.bg,
            style.border
        )}>
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={120} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2 rounded-lg border border-white/20 shadow-inner", style.icon)}>
                        <Icon size={20} className="text-white" />
                    </div>
                </div>
                <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter mb-0.5 tabular-nums">{value}</h3>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">{title}</p>
                </div>
            </div>

            {subtext && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="text-[10px] text-white/80 font-bold uppercase tracking-wider italic flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {subtext}
                    </div>
                </div>
            )}
        </Link>
    );
}

// --- List Items (Dense & Clean) ---
function JobRow({ job, isActive }: { job: any, isActive?: boolean }) {
    if (isActive) {
        return (
            <Link href="/technician/repairs" className="group relative bg-[#09090b] border border-t-blue-500/50 border-x-zinc-800 border-b-zinc-800 rounded-[2rem] p-6 flex flex-col gap-6 overflow-hidden transition-all hover:border-blue-500/30 shadow-2xl hover:shadow-[0_10px_40px_rgba(37,99,235,0.15)]">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute top-4 right-4 text-zinc-900 opacity-50 pointer-events-none">
                    <Smartphone size={140} strokeWidth={0.5} />
                </div>

                {/* Header: Status & Ticket */}
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] shadow-black drop-shadow-sm">En Proceso</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 shadow-inner group-hover:border-blue-500/30 transition-colors">
                        <span className="text-sm font-black font-mono text-white tracking-wider block tabular-nums text-right">{job.ticket}</span>
                    </div>
                </div>

                {/* Main Info: Device */}
                <div className="relative z-10 mt-2">
                    <h4 className="text-3xl font-black text-white tracking-tighter leading-none mb-2 group-hover:text-blue-500 transition-colors duration-300 drop-shadow-md">
                        {job.device}
                    </h4>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{job.repairType || "Servicio Técnico"}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 relative z-10 mt-2">
                    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm group-hover:border-zinc-700 transition-colors">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1 tracking-widest flex items-center gap-1.5">
                            <User size={10} /> Cliente
                        </p>
                        <p className="text-xs font-black text-zinc-200 truncate">{job.customer}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm group-hover:border-zinc-700 transition-colors">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1 tracking-widest flex items-center gap-1.5">
                            <Clock size={10} /> Ingreso
                        </p>
                        <p className="text-xs font-black text-zinc-200 truncate">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-auto pt-4 flex justify-end relative z-10">
                    <div className="h-12 pl-7 pr-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-3 transition-all cursor-pointer shadow-lg shadow-blue-900/20 group-hover:shadow-blue-600/40 group-hover:scale-[1.02]">
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Continuar</span>
                        <ArrowRight size={18} strokeWidth={3} />
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href="/technician/tickets" className="group block p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all mb-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

            <div className="flex justify-between items-start mb-3">
                <div className="px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-xs font-black tracking-wider group-hover:text-white group-hover:border-blue-500/30 transition-colors">
                    {job.ticket}
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                    <ArrowUpRight size={14} />
                </div>
            </div>

            <div>
                <h4 className="text-base font-black text-white leading-tight mb-1 group-hover:text-blue-400 transition-colors">{job.device}</h4>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950/50 px-2 py-0.5 rounded">{job.customer}</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{job.repairType || "Reparación"}</span>
                </div>
            </div>
        </Link>
    );
}


export function UnifiedTechnicianDashboard({ stats, user }: { stats: any, user: any }) {
    const activeJobs = stats.activeWorkspace || [];
    const queue = stats.queue || [];

    // Use data for chart
    const weeklyData = stats.weeklyOutput || [];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 lg:p-10">

            {/* Header */}
            <div className="flex items-center justify-between mb-10 pb-8 border-b border-zinc-900">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
                        <Wrench className="text-blue-500" size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Dashboard <span className="text-blue-500 font-black">Técnico</span>
                        </h1>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-1">
                            Sistema de Gestión • {user.name}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex flex-col items-end">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">v4.0.5 PROFESSIONAL</div>
                    <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Sincronizado</span>
                    </div>
                </div>
            </div>

            {/* Stagnation Radar - Serious Alert */}
            {stats.stagnatedRepairs && stats.stagnatedRepairs.length > 0 && (
                <div className="mb-10 rounded-3xl bg-[#0F0505] border border-red-900/50 relative overflow-hidden group shadow-[0_0_50px_rgba(220,38,38,0.1)]">
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

                    <div className="p-8 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-pulse">
                                    <AlertTriangle size={32} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                        Atención Requerida
                                    </h3>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">
                                            {stats.stagnatedRepairs.length}
                                        </span>
                                        <span className="text-lg font-bold text-zinc-400 tracking-tight">
                                            UNIDADES CON DEMORA CRÍTICA
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:block">
                                <Link href="/technician/repairs?filter=critical" className="px-6 py-3 bg-red-950/50 hover:bg-red-900/50 border border-red-900/50 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 group-hover:border-red-500/50">
                                    Ver Todas <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {stats.stagnatedRepairs.map((r: any) => (
                                <Link key={r.id} href="/technician/repairs" className="group/card relative bg-black/40 border border-red-900/30 hover:border-red-500 mb-1 rounded-2xl p-5 transition-all hover:bg-red-950/10 hover:shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col justify-between h-full">
                                    <div className="absolute top-3 right-3">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 bg-red-950/40 px-2 py-1 rounded-lg border border-red-900/50">
                                            <Timer size={12} />
                                            {r.daysInactive} DÍAS
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="inline-block px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] font-black tracking-wider mb-3 group-hover/card:text-white group-hover/card:border-red-500/30 transition-colors">
                                            {r.ticketNumber || r.ticket}
                                        </div>
                                        <h4 className="text-lg font-black text-zinc-100 group-hover/card:text-red-400 transition-colors leading-tight">
                                            {r.device}
                                        </h4>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{r.statusName}</span>
                                        <ArrowRight size={16} className="text-red-500 opacity-0 group-hover/card:opacity-100 -translate-x-2 group-hover/card:translate-x-0 transition-all duration-300" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <TechMetric title="En Mesa" value={stats.activeRepairs} subtext="En Proceso" icon={PlayCircle} color="blue" href="/technician/repairs" />
                <TechMetric title="En Cola" value={stats.pendingTickets} subtext="Pendientes" icon={ListTodo} color="orange" href="/technician/tickets" />
                <TechMetric title="Finalizados" value={stats.completedToday} subtext="Turno Hoy" icon={CheckCircle2} color="emerald" href="/technician/history" />
                <TechMetric title="Eficiencia" value={stats.avgRepairTime} subtext="Tiempo Promedio" icon={Timer} color="violet" href="/technician/history" />

                <TechMetric title="Calidad" value={`${stats.qualityScore || 100}%`} subtext="Sin Garantías" icon={ShieldCheck} color="emerald" href="/technician/profile" />
                <TechMetric title="Puntualidad" value={`${stats.onTimeRate || 100}%`} subtext="Entregas OK" icon={CalendarCheck} color="blue" href="/technician/profile" />
                <TechMetric title="Producción" value={stats.completedMonth} subtext="Mensual" icon={Calendar} color="violet" href="/technician/history" />
                {(() => {
                    const current = stats.completedMonth || 0;
                    const last = stats.completedLastMonth || 0;
                    let growth = 0;
                    if (last > 0) growth = Math.round(((current - last) / last) * 100);
                    else if (current > 0) growth = 100;
                    const sign = growth > 0 ? "+" : "";
                    return (
                        <TechMetric title="Crecimiento" value={`${sign}${growth}%`} subtext="vs Mes Anterior" icon={ArrowUpRight} color={growth >= 0 ? "emerald" : "orange"} href="/technician/profile" />
                    );
                })()}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

                <div className="xl:col-span-2 space-y-10">
                    {/* Workspace */}
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-zinc-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />
                                Espacio de Trabajo
                            </h2>
                            <div className="h-px flex-1 mx-8 bg-zinc-900" />
                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/30 uppercase tracking-[0.2em]">
                                {activeJobs.length} Activos
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeJobs.length === 0 ? (
                                <div className="col-span-full py-20 border-2 border-dashed border-zinc-900 rounded-[3rem] flex flex-col items-center justify-center text-zinc-700 bg-zinc-950/50">
                                    <Smartphone size={48} className="mb-4 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Workshop despejado</p>
                                </div>
                            ) : (
                                activeJobs.map((job: any) => (
                                    <JobRow key={job.id} job={job} isActive={true} />
                                ))
                            )}
                        </div>
                    </div>

                    <WeeklyOutputChart data={weeklyData} />
                </div>

                {/* Queue */}
                <div className="xl:col-span-1">
                    <div className="bg-[#09090b] rounded-[3rem] border-2 border-zinc-900 p-10 h-full flex flex-col shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 opacity-50" />

                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-zinc-100 mb-1">Cola de Espera</h2>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Siguiente Prioridad</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                                <ListTodo className="text-orange-500" size={24} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 max-h-[650px]">
                            {queue.length === 0 ? (
                                <div className="py-24 text-center opacity-30">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin pendientes</p>
                                </div>
                            ) : (
                                queue.map((item: any) => (
                                    <JobRow key={item.id} job={item} isActive={false} />
                                ))
                            )}
                        </div>

                        <div className="mt-10 p-6 bg-zinc-950 rounded-[2rem] border border-zinc-900 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Carga de Trabajo</span>
                                <span className="text-xs font-black text-orange-500 tabular-nums">{Math.round((queue.length / 10) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all duration-1000"
                                    style={{ width: `${Math.min((queue.length / 10) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
