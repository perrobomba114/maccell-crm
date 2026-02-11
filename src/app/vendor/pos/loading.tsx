import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, ShoppingCart, User, Plus, Package } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] gap-6 p-6 animate-in fade-in duration-500 max-w-[1800px] mx-auto">

            {/* LEFT PANEL - Product Selection */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">

                {/* Search Bar Skeleton */}
                <div className="relative">
                    <div className="absolute left-4 top-3.5 text-zinc-400">
                        <Search className="h-5 w-5" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" />
                </div>

                {/* Categories & Products Grid */}
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Category Tabs Skeleton */}
                    <div className="flex gap-2 overflow-x-hidden pb-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-9 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                        ))}
                    </div>

                    {/* Products Grid Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-hidden pr-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                            <Card key={i} className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden flex flex-col h-[220px]">
                                <div className="h-32 bg-zinc-100 dark:bg-zinc-800 relative flex items-center justify-center">
                                    <Package className="h-8 w-8 text-zinc-300" />
                                </div>
                                <div className="p-3 flex flex-col gap-2 flex-1">
                                    <Skeleton className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700" />
                                    <Skeleton className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800" />
                                    <div className="mt-auto flex justify-between items-center pt-2">
                                        <Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-md" />
                                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - Cart Summary */}
            <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col h-full bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                {/* Cart Header */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-zinc-500" />
                            <h2 className="font-bold text-zinc-800 dark:text-zinc-200">Orden Actual</h2>
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    </div>

                    {/* Customer Selection Skeleton */}
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-zinc-400">
                            <User className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
                        <div className="absolute right-2 top-2">
                            <Plus className="h-5 w-5 text-zinc-300" />
                        </div>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 p-4 space-y-4 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-12 w-12 rounded-md bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-12 bg-zinc-100 dark:bg-zinc-800" />
                                    <Skeleton className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Footer / Totals */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 space-y-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700" />
                            <Skeleton className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex justify-between text-sm">
                            <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700" />
                            <Skeleton className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-24 bg-zinc-300 dark:bg-zinc-600 rounded-md" />
                            <Skeleton className="h-8 w-32 bg-zinc-300 dark:bg-zinc-600 rounded-md" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                        <Skeleton className="h-12 w-full rounded-xl bg-blue-600/20" />
                    </div>
                </div>
            </div>
        </div>
    );
}
