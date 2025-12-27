"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Store, DollarSign, TrendingUp, ShoppingCart, CreditCard, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCashDashboardStats, CashDashboardStats, getDeepCashShiftsForDate, CashShiftWithDetails } from "@/actions/cash-shift-actions";
import { CashShiftTable } from "./cash-shift-table";
import { Branch } from "@prisma/client";
import { cn } from "@/lib/utils";

interface AdminCashDashboardProps {
    initialBranches: Branch[];
}

export function AdminCashDashboard({ initialBranches }: AdminCashDashboardProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBranch, setSelectedBranch] = useState("ALL");
    const [stats, setStats] = useState<CashDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [dayShifts, setDayShifts] = useState<CashShiftWithDetails[]>([]);
    const [isLoadingDay, setIsLoadingDay] = useState(false);

    // Fetch Monthly Stats (aggregated)
    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setStats(null);
            try {
                const data = await getCashDashboardStats(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    selectedBranch
                );
                setStats(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [currentDate, selectedBranch]);

    // Fetch Daily Details when day selected
    useEffect(() => {
        const fetchDailyDetails = async () => {
            if (!selectedDay) return;

            setIsLoadingDay(true);
            setDayShifts([]);
            try {
                const details = await getDeepCashShiftsForDate(selectedDay, selectedBranch);
                setDayShifts(details);
            } catch (error) {
                console.error("Error fetching daily details:", error);
            } finally {
                setIsLoadingDay(false);
            }
        };

        if (selectedDay) {
            fetchDailyDetails();
        }
    }, [selectedDay, selectedBranch]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Calendar Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);

    const getDailyTotal = (date: Date) => {
        if (!stats) return 0;
        return stats.shifts
            .filter(s => isSameDay(new Date(s.startTime), date))
            .reduce((acc, s) => acc + s.totals.totalSales, 0);
    };

    const getDailyShiftCount = (date: Date) => {
        if (!stats) return 0;
        return stats.shifts.filter(s => isSameDay(new Date(s.startTime), date)).length;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Filters - SAME AS BEFORE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-muted/40 p-1.5 rounded-lg border">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-lg font-semibold capitalize w-40 text-center">
                        {format(currentDate, "MMMM yyyy", { locale: es })}
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Todas las Sucursales" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas las Sucursales</SelectItem>
                            {initialBranches.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards - SAME AS BEFORE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* ... reuse KpiCard calls from original ... */}
                <KpiCard
                    title="Ingresos Totales"
                    value={stats ? formatCurrency(stats.kpi.totalAmount) : "..."}
                    icon={DollarSign}
                    trend={stats?.kpi.growthPercentage}
                    loading={isLoading}
                    className="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    iconClass="text-emerald-600"
                />
                <KpiCard
                    title="Ventas Totales"
                    value={stats ? stats.kpi.totalCount.toString() : "..."}
                    icon={ShoppingCart}
                    subValue="Transacciones"
                    loading={isLoading}
                    className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                    iconClass="text-blue-600"
                />
                <KpiCard
                    title="Ticket Promedio"
                    value={stats ? formatCurrency(stats.kpi.averageTicket) : "..."}
                    icon={TrendingUp}
                    subValue="Por venta"
                    loading={isLoading}
                    className="bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400"
                    iconClass="text-violet-600"
                />
                <KpiCard
                    title="Gastos Totales"
                    value={stats ? formatCurrency(stats.kpi.totalExpenses) : "..."}
                    icon={CreditCard}
                    subValue="Salidas de caja"
                    loading={isLoading}
                    className="bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400"
                    iconClass="text-orange-600"
                />
            </div>

            {/* Calendar */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <span className="capitalize">{format(currentDate, "MMMM", { locale: es })}</span>
                    </h3>
                </div>

                <div className="grid grid-cols-7 border-b bg-muted/20">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 min-h-[500px]">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-muted/5 border-r border-b min-h-[100px]" />
                    ))}

                    {daysInMonth.map((date) => {
                        const total = getDailyTotal(date);
                        const count = getDailyShiftCount(date);
                        const isToday = isSameDay(date, new Date());
                        const hasData = count > 0;

                        return (
                            <div
                                key={date.toString()}
                                className={cn(
                                    "flex flex-col p-2 border-r border-b min-h-[120px] transition-colors relative group hover:bg-muted/50 cursor-pointer",
                                    isToday && "bg-blue-50/50 dark:bg-blue-950/20"
                                )}
                                onClick={() => {
                                    if (hasData || isToday) setSelectedDay(date);
                                }}
                            >
                                <span className={cn(
                                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-2",
                                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {format(date, "d")}
                                </span>

                                {hasData && (
                                    <div className="mt-auto space-y-1">
                                        <div className="text-sm font-bold truncate text-foreground">
                                            {formatCurrency(total)}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium flex items-center justify-between">
                                            <span>{count} cajas</span>
                                        </div>
                                    </div>
                                )}

                                {!hasData && isToday && (
                                    <div className="mt-auto text-[10px] text-center text-muted-foreground italic">
                                        Hoy
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
                        <DialogTitle>
                            Movimientos del {selectedDay && format(selectedDay, "d 'de' MMMM, yyyy", { locale: es })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                        {isLoadingDay ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            selectedDay && (
                                <CashShiftTable shifts={dayShifts} />
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, trend, subValue, loading, className, iconClass }: any) {
    return (
        <Card className={cn("overflow-hidden border-l-4 shadow-sm", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", iconClass)} />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                ) : (
                    <>
                        <div className="text-2xl font-bold tracking-tight">{value}</div>
                        {(trend !== undefined || subValue) && (
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                {trend !== undefined && (
                                    <span className={cn("flex items-center font-medium", trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-muted-foreground")}>
                                        {trend > 0 && "+"}
                                        {trend.toFixed(1)}%
                                        <span className="ml-1 text-muted-foreground font-normal">vs mes anterior</span>
                                    </span>
                                )}
                                {subValue && !trend && <span>{subValue}</span>}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
