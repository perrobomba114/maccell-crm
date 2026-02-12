"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, SparePart } from "@prisma/client";
import { createSparePart, updateSparePart } from "@/actions/spare-parts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Box, DollarSign, Tag, Barcode, Grid, Package } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(1, "Requerido"),
    sku: z.string().min(1, "Requerido"),
    brand: z.string().min(1, "Requerido"),
    categoryId: z.string().min(1, "Requerido"),
    stockLocal: z.coerce.number().min(0, "Mínimo 0"),
    stockDepot: z.coerce.number().min(0, "Mínimo 0"),
    maxStockLocal: z.coerce.number().min(0, "Mínimo 0"),
    priceUsd: z.coerce.number().min(0, "Mínimo 0"),
    pricePos: z.coerce.number().min(0, "Mínimo 0"),
});

interface SparePartFormProps {
    initialData?: SparePart;
    categories: Category[];
    onSuccess?: () => void;
}

export function SparePartForm({ initialData, categories, onSuccess }: SparePartFormProps) {
    const [rate, setRate] = useState<number>(0);
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("https://dolarapi.com/v1/dolares/oficial")
            .then(res => res.json())
            .then(data => setRate(data.venta))
            .catch(console.error);
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: initialData ? {
            name: initialData.name,
            sku: initialData.sku,
            brand: initialData.brand,
            categoryId: initialData.categoryId || "",
            stockLocal: initialData.stockLocal,
            stockDepot: initialData.stockDepot,
            maxStockLocal: initialData.maxStockLocal,
            priceUsd: initialData.priceUsd,
            pricePos: initialData.pricePos || 0,
        } : {
            name: "",
            sku: "",
            brand: "",
            categoryId: "",
            stockLocal: 0,
            stockDepot: 0,
            maxStockLocal: 0,
            priceUsd: 0,
            pricePos: 0,
        },
    });

    const priceUsd = form.watch("priceUsd");
    const priceArg = priceUsd && rate ? priceUsd * rate : 0;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            if (initialData) {
                const res = await updateSparePart(initialData.id, {
                    ...values,
                    priceArg
                });
                if (!res.success) throw new Error(res.error);
                toast.success("Repuesto Actualizado");
            } else {
                const res = await createSparePart({
                    ...values,
                    priceArg
                });
                if (!res.success) throw new Error(res.error);
                toast.success("Repuesto Creado");
            }
            router.refresh();
            onSuccess?.();
            if (!initialData) form.reset();
        } catch (error: any) {
            toast.error(error.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-2">

                {/* 1. PRODUCT NAME - STANDARD INPUT, CENTERED */}
                <div className="w-full">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex justify-center uppercase text-xs font-bold text-muted-foreground mb-1">Nombre del Repuesto</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ingrese el nombre..."
                                        {...field}
                                        className="text-center font-bold text-lg h-12"
                                    />
                                </FormControl>
                                <FormMessage className="text-center" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* 2. MAIN CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* CARD 1: IDENTITY */}
                    <Card className="border shadow-none">
                        <CardHeader className="py-3 px-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20">
                            <CardTitle className="text-center text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-500">
                                Identidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">SKU / Código</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="CODE-123" className="text-center font-mono font-bold h-9 text-white border-blue-200" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">Marca</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Samsung..." className="text-center h-9 text-white border-blue-200 font-bold" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">Categoría</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-9 w-full justify-center text-center px-8 relative text-white border-blue-200 font-bold">
                                                    <div className="flex items-center justify-center w-full text-center">
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[200px] z-[100]">
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id} className="justify-center text-center cursor-pointer">
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* CARD 2: STOCK */}
                    <Card className="border shadow-none">
                        <CardHeader className="py-3 px-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20">
                            <CardTitle className="text-center text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
                                Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="stockLocal"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="block text-center text-[10px] font-bold uppercase text-amber-600">Local</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="text-center font-bold text-lg h-10 border-amber-200 focus-visible:ring-amber-500 text-white" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="stockDepot"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="block text-center text-[10px] font-bold uppercase text-amber-600">Depósito</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="text-center font-bold text-lg h-10 border-amber-200 focus-visible:ring-amber-500 text-white" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="maxStockLocal"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-amber-600">Ideal (Máximo)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="text-center font-mono h-9 border-amber-200 text-white font-bold" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* CARD 3: PRICING */}
                    <Card className="border shadow-none">
                        <CardHeader className="py-3 px-4 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20">
                            <CardTitle className="text-center text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500">
                                Finanzas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <FormField
                                control={form.control}
                                name="priceUsd"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-emerald-600">Costo (USD)</FormLabel>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 font-bold text-emerald-600">$</span>
                                            <Input type="number" step="0.01" {...field} className="text-center font-mono font-bold text-lg h-10 border-emerald-200 focus-visible:ring-emerald-500 text-emerald-600" />
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pricePos"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">Venta (POS)</FormLabel>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 font-bold text-blue-600">$</span>
                                            <Input type="number" step="0.01" {...field} className="text-center font-mono font-bold text-lg h-10 border-blue-200 focus-visible:ring-blue-500 text-blue-600" />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* EST. ARS BOX */}
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-xl p-3 text-center border-2 border-emerald-200 dark:border-emerald-800">
                                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                                    Costo ARS (Est.)
                                </div>
                                <div className="font-mono font-black text-xl text-emerald-800 dark:text-emerald-300">
                                    ${priceArg.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                    <Button type="button" variant="ghost" onClick={() => onSuccess?.()} className="h-10 text-xs uppercase font-bold tracking-wide">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="h-10 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide">
                        {loading ? "Guardando..." : initialData ? "Guardar Cambios" : "Crear Repuesto"}
                    </Button>
                </div>

            </form>
        </Form>
    );
}
