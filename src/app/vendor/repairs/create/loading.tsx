import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { User, Smartphone, FileText, Wrench } from "lucide-react";

export default function Loading() {
    return (
        <div className="w-full max-w-[800px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800" />
                    <Skeleton className="h-4 w-48 bg-zinc-100 dark:bg-zinc-900" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
            </div>

            {/* Form Skeleton */}
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/20 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
                <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 pb-6 space-y-6">
                    {/* User Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-zinc-400" />
                                <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="w-4 h-4 text-zinc-400" />
                                <Skeleton className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-1/3 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                                <Skeleton className="h-10 w-2/3 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                            </div>
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-8">
                    {/* Device Details Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                            <Wrench className="w-5 h-5 text-zinc-400" />
                            <Skeleton className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-24 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                            <Skeleton className="h-24 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                        </div>

                        <Skeleton className="h-12 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            <Skeleton className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                        <Skeleton className="h-20 w-full rounded-md bg-zinc-100 dark:bg-zinc-900" />
                    </div>
                </CardContent>

                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/30 p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                    <Skeleton className="h-11 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <Skeleton className="h-11 w-40 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
                </CardFooter>
            </Card>
        </div>
    );
}
