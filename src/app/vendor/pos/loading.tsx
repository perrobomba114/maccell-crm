import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, PackageCheck, Search, ShoppingCart, Smartphone, Store, type LucideIcon } from "lucide-react";

export default function Loading() {
    return (
        <div className="relative flex h-full w-full max-w-full flex-col gap-4 overflow-hidden bg-black p-4 text-white lg:flex-row">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_78%_6%,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_88%_92%,rgba(251,191,36,0.10),transparent_24%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[auto,auto,auto,42px_42px,42px_42px]" />

            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                <section className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
                    <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-emerald-300" />
                    <div className="flex items-center gap-4 pl-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                            <Store className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-5 w-44 rounded-md bg-white/10" />
                            <Skeleton className="h-8 w-72 max-w-full rounded-md bg-white/10" />
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                    <SearchBlock icon={Search} tone="cyan" />
                    <SearchBlock icon={Smartphone} tone="blue" />
                </div>

                <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 p-4 shadow-xl shadow-black/20">
                    <div className="mb-4 flex items-center gap-2">
                        <span className="h-9 w-1 rounded-r-full bg-cyan-300" />
                        <Skeleton className="h-5 w-48 rounded-md bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                            <div key={item} className="relative overflow-hidden rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 pl-5">
                                <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-cyan-300" />
                                <div className="mb-5 flex items-start justify-between">
                                    <Skeleton className="h-6 w-24 rounded-md bg-white/10" />
                                    <Skeleton className="h-6 w-16 rounded-md bg-white/10" />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-cyan-950">
                                        <PackageCheck className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-full rounded-md bg-white/10" />
                                        <Skeleton className="h-4 w-2/3 rounded-md bg-white/10" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
                                    <Skeleton className="h-4 w-14 rounded-md bg-white/10" />
                                    <Skeleton className="h-7 w-24 rounded-md bg-white/10" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <aside className="relative z-10 flex h-[42vh] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-emerald-300/20 bg-zinc-950/80 shadow-2xl shadow-black/25 lg:h-full lg:w-[22rem] xl:w-[26rem]">
                <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-emerald-300" />
                <div className="flex items-center gap-3 border-b border-white/10 bg-emerald-300/5 p-5 pl-6">
                    <div className="rounded-lg bg-emerald-300 p-2 text-emerald-950">
                        <ShoppingCart className="h-5 w-5" />
                    </div>
                    <Skeleton className="h-6 w-28 rounded-md bg-white/10" />
                </div>
                <div className="flex-1 space-y-3 p-5">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-20 rounded-lg bg-white/10" />
                    ))}
                </div>
                <div className="border-t border-white/10 bg-black/30 p-5">
                    <div className="mb-5 flex items-end justify-between">
                        <Skeleton className="h-5 w-24 rounded-md bg-white/10" />
                        <Skeleton className="h-10 w-36 rounded-md bg-white/10" />
                    </div>
                    <div className="flex h-14 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950">
                        <CreditCard className="h-5 w-5" />
                    </div>
                </div>
            </aside>
        </div>
    );
}

function SearchBlock({ icon: Icon, tone }: { icon: LucideIcon; tone: "cyan" | "blue" }) {
    const color = tone === "cyan" ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-blue-300/20 bg-blue-300/10 text-blue-100";
    const rail = tone === "cyan" ? "bg-cyan-300" : "bg-blue-300";

    return (
        <section className={`relative overflow-hidden rounded-xl border p-4 shadow-xl shadow-black/15 ${color}`}>
            <span className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${rail}`} />
            <div className="mb-3 flex items-center gap-2 pl-2 text-xs font-black uppercase">
                <Icon className="h-4 w-4" />
                <Skeleton className="h-4 w-28 rounded-md bg-white/10" />
            </div>
            <Skeleton className="h-14 rounded-lg bg-black/35" />
        </section>
    );
}
