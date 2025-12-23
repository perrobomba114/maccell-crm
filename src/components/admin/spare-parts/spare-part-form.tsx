"use client";
import { Package, DollarSign, Store } from "lucide-react";
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
import { Category, SparePart } from "@prisma/client";
import { createSparePart, updateSparePart } from "@/actions/spare-parts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    sku: z.string().min(1, "El SKU es requerido"),
    brand: z.string().min(1, "La marca es requerida"),
    categoryId: z.string().min(1, "La categoría es requerida"),
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

    // Fetch rate for calculation display
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
                toast.success("Repuesto actualizado");
            } else {
                const res = await createSparePart({
                    ...values,
                    priceArg
                });
                if (!res.success) throw new Error(res.error);
                toast.success("Repuesto creado");
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* General Info Section */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-700 dark:text-blue-400">
                        <div className="h-6 w-1 rounded-full bg-blue-600 dark:bg-blue-500" />
                        Información General
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del repuesto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SKU</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Código único" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="brand"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Marca</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Samsung, Apple" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Stock Section */}
                <div className="space-y-4 pt-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
                        <div className="h-6 w-1 rounded-full bg-amber-600 dark:bg-amber-500" />
                        Inventario y Stock
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="stockLocal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Local</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stockDepot"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Depósito</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="maxStockLocal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cant. Máxima</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="space-y-4 pt-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                        <div className="h-6 w-1 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                        Precios
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="priceUsd"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio USD</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricePos"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pos (Precio Fijo)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium mt-1">Precio ARG (Estimado)</span>
                            <div className="h-10 px-3 py-2 border rounded-md bg-muted text-green-600 font-bold font-mono flex items-center">
                                ${priceArg.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>

                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onSuccess?.()}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Guardando..." : initialData ? "Actualizar" : "Crear"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
