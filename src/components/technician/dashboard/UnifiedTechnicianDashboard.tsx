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
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WeeklyOutputChart, MyStatusPieChart } from "./TechnicianCharts";

// --- Standard Metrics Component ---
function TechMetric({ title, value, icon: Icon, color, subtext, href }: any) {
    const colors: any = {
        violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };

    return (
        <Link href={href || "#"} className="group relative p-6 rounded-2xl bg-[#18181b] border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all flex flex-col justify-between overflow-hidden">
            <div className={cn("absolute top-0 right-0 p-3 opacity-20 -mr-2 -mt-2 rounded-bl-3xl transition-transform group-hover:scale-110 duration-500", colors[color])}>
                <Icon size={40} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2 rounded-lg inline-flex", colors[color])}>
                        <Icon size={20} />
                    </div>
                </div>
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-zinc-400 transition-colors">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                </div>
            </div>
            {subtext && <div className="mt-4 pt-3 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">{subtext}</p>
            </div>}
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

            {/* Metrics Grid - 4 Equal Columns */}
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
                    title="Eficiencia"
                    value={stats.avgRepairTime}
                    subtext="Tiempo prom."
                    icon={Timer}
                    color="violet"
                    href="/technician/profile"
                />
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
