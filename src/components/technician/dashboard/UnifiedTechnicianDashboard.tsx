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
        violet: {
            bg: "bg-gradient-to-br from-violet-600 to-fuchsia-600",
            icon: "bg-white/20 text-white",
            border: "border-violet-500/50"
        },
        blue: {
            bg: "bg-gradient-to-br from-blue-600 to-cyan-500",
            icon: "bg-white/20 text-white",
            border: "border-blue-500/50"
        },
        emerald: {
            bg: "bg-gradient-to-br from-emerald-500 to-teal-500",
            icon: "bg-white/20 text-white",
            border: "border-emerald-500/50"
        },
        orange: {
            bg: "bg-gradient-to-br from-orange-500 to-red-500",
            icon: "bg-white/20 text-white",
            border: "border-orange-500/50"
        },
    };

    const style = strategies[color] || strategies.blue;

    return (
        <Link href={href || "#"} className={cn(
            "group relative p-6 rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/50 flex flex-col justify-between overflow-hidden border",
            style.bg,
            style.border
        )}>
            {/* Glass Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            {/* Floating Icon Background */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
                <Icon size={80} className="text-white" />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-2xl backdrop-blur-md shadow-lg", style.icon)}>
                        <Icon size={24} />
                    </div>
                </div>
                <div>
                    <h3 className="text-4xl font-black text-white tracking-tight mb-1 drop-shadow-sm">{value}</h3>
                    <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">{title}</p>
                </div>
            </div>

            {subtext && (
                <div className="mt-4 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <p className="text-xs text-white/90 font-medium">{subtext}</p>
                    </div>
                </div>
            )}
        </Link>
    );
}

// --- List Items (Dense & Clean) ---
function JobRow({ job, isActive }: { job: any, isActive?: boolean }) {
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-xl border transition-all group",
            isActive
                ? "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-violet-500/30"
                : "bg-zinc-900/30 border-transparent hover:bg-zinc-900 hover:border-zinc-800"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border",
                    isActive ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                )}>
                    {isActive ? <PlayCircle size={16} /> : <div className="text-[10px]">#{job.ticket}</div>}
                </div>

                <div>
                    <h4 className="font-bold text-zinc-200 text-sm group-hover:text-white transition-colors">
                        {job.device}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-mono border",
                            isActive ? "bg-violet-950 text-violet-400 border-violet-900" : "bg-zinc-950 text-zinc-500 border-zinc-800"
                        )}>
                            {isActive ? "En Progreso" : job.repairType}
                        </span>
                        <span className="text-xs text-zinc-500 truncate max-w-[120px]">{job.customer}</span>
                    </div>
                </div>
            </div>

            <Link href={isActive ? "/technician/repairs" : "/technician/tickets"} className={cn(
                "p-2 rounded-lg transition-colors",
                isActive ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            )}>
                {isActive ? <ArrowUpRight size={18} /> : <ArrowRight size={16} />}
            </Link>
        </div>
    );
}


export function UnifiedTechnicianDashboard({ stats, user }: { stats: any, user: any }) {
    const activeJobs = stats.activeWorkspace || [];
    const queue = stats.queue || [];

    // Use data for chart
    const weeklyData = stats.weeklyOutput || [];

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8 xl:p-10 selection:bg-violet-500/30">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 border-b border-zinc-900/50 pb-8">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                        <Wrench className="text-violet-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Panel Técnico</h1>
                        <p className="text-zinc-500 text-sm">Bienvenido, {user.name}.</p>
                    </div>
                </div>
                <div className="hidden md:block text-xs font-mono text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">
                    v2.1
                </div>
            </div>

            {/* Stagnation Radar - Conditional Alert */}
            {stats.stagnatedRepairs && stats.stagnatedRepairs.length > 0 && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-500 animate-pulse">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-400">Radar de Demoras</h3>
                            <p className="text-xs text-red-300">Hay {stats.stagnatedRepairs.length} equipos sin movimiento hace +48hs.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {stats.stagnatedRepairs.map((r: any) => (
                            <Link key={r.id} href="/technician/repairs" className="flex-shrink-0 min-w-[200px] p-3 rounded-xl bg-red-950/30 border border-red-500/10 hover:border-red-500/30 transition-colors group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-mono font-bold text-red-300">#{r.ticketNumber}</span>
                                    <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">{r.daysInactive}d inact.</span>
                                </div>
                                <p className="text-sm font-medium text-white truncate mb-0.5">{r.device}</p>
                                <p className="text-xs text-zinc-500 group-hover:text-zinc-400">{r.statusName}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Metrics Grid - 2 Rows of 4 for better balance */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <TechMetric
                    title="En Mesa"
                    value={stats.activeRepairs}
                    subtext="Activos ahora"
                    icon={PlayCircle}
                    color="blue"
                    href="/technician/repairs"
                />
                <TechMetric
                    title="En Cola"
                    value={stats.pendingTickets}
                    subtext="Por revisar"
                    icon={ListTodo}
                    color="orange"
                    href="/technician/tickets"
                />
                <TechMetric
                    title="Finalizados"
                    value={stats.completedToday}
                    subtext="Hoy"
                    icon={CheckCircle2}
                    color="emerald"
                    href="/technician/history"
                />
                <TechMetric
                    title="Total Mes"
                    value={stats.completedMonth}
                    subtext="Equipos reparados"
                    icon={Calendar}
                    color="violet"
                    href="/technician/history"
                />

                {/* Row 2 */}
                <TechMetric
                    title="Eficiencia"
                    value={stats.avgRepairTime}
                    subtext="Tiempo prom."
                    icon={Timer}
                    color="violet"
                    href="/technician/profile"
                />
                <TechMetric
                    title="Calidad"
                    value={`${stats.qualityScore || 100}%`}
                    subtext="Sin Garantías"
                    icon={ShieldCheck}
                    color="emerald" // Green for Quality
                    href="/technician/profile"
                />
                <TechMetric
                    title="Puntualidad"
                    value={`${stats.onTimeRate || 100}%`}
                    subtext="A tiempo"
                    icon={CalendarCheck}
                    color="blue"
                    href="/technician/profile"
                />

                {/* Growth Card */}
                {(() => {
                    const current = stats.completedMonth || 0;
                    const last = stats.completedLastMonth || 0;
                    let growth = 0;
                    if (last > 0) {
                        growth = Math.round(((current - last) / last) * 100);
                    } else if (current > 0) {
                        growth = 100; // Minimal positive interpretation
                    }
                    const sign = growth > 0 ? "+" : "";

                    return (
                        <TechMetric
                            title="Crecimiento"
                            value={`${sign}${growth}%`}
                            subtext={`vs ${last} (Mes Ant.)`}
                            icon={ArrowUpRight} // Using ArrowUpRight as existing import
                            color={growth >= 0 ? "emerald" : "orange"}
                            href="/technician/profile"
                        />
                    );
                })()}
            </div>

            {/* Main Balanced Grid: 2 Columns (2/3 vs 1/3) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Column 1: Workflow Management (Lists and Charts) */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Panel 1: Active Workspace */}
                    <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <PlayCircle className="text-blue-500" size={20} />
                                Espacio de Trabajo
                            </h2>
                            <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full border border-blue-500/20">
                                {activeJobs.length} Activos
                            </span>
                        </div>

                        <div className="space-y-3">
                            {activeJobs.length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-zinc-800/50 rounded-xl flex flex-col items-center justify-center text-zinc-600">
                                    <Wrench size={32} className="mb-3 opacity-50" />
                                    <p className="text-sm">No tienes trabajos activos.</p>
                                    <p className="text-xs">Toma uno de la cola para empezar.</p>
                                </div>
                            ) : (
                                activeJobs.map((job: any) => (
                                    <JobRow key={job.id} job={job} isActive={true} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Panel 2: Weekly Output Chart (SINGLE INSTANCE HERE) */}
                    <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 min-h-[350px]">
                        <WeeklyOutputChart data={weeklyData} />
                    </div>

                </div>

                {/* Column 2: Queue (Side list) */}
                <div className="xl:col-span-1">
                    <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <ListTodo className="text-orange-500" size={20} />
                                Cola de Espera
                            </h2>
                            <span className="text-xs font-bold text-zinc-500">{queue.length} Pendientes</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[800px]">
                            {queue.length === 0 ? (
                                <div className="py-20 text-center text-zinc-500 text-sm">
                                    <p>Cola vacía. ¡Buen trabajo!</p>
                                </div>
                            ) : (
                                queue.map((item: any) => (
                                    <JobRow key={item.id} job={item} isActive={false} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
