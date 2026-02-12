"use client";
import { Package, DollarSign, Store, Tag, Box } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProduct, updateProduct } from "@/actions/products";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Category, Product, Branch } from "@prisma/client";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
    name: z.string().min(2, "Requerido"),
    sku: z.string().min(1, "Requerido"),
    categoryId: z.string().optional(),
    costPrice: z.string(),
    profitMargin: z.string(),
    price: z.string(),
    description: z.string().optional(),
    stocks: z.array(z.object({
        branchId: z.string(),
        quantity: z.string()
    })).optional()
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Product;
    categories: Category[];
    branches: Branch[];
}

export function ProductForm({ open, onOpenChange, product, categories, branches }: ProductFormProps) {
    const router = useRouter();
    const isEditing = !!product;

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: product ? {
            name: product.name,
            sku: product.sku,
            categoryId: product.categoryId || undefined,
            costPrice: String(product.costPrice || 0),
            profitMargin: String(product.profitMargin || 0),
            price: String(product.price || 0),
            description: product.description || "",
            stocks: branches.map(b => ({
                branchId: b.id,
                quantity: String(product && (product as any).stock
                    ? (product as any).stock.find((s: any) => s.branchId === b.id)?.quantity ?? 0
                    : 0)
            }))
        } : {
            name: "",
            sku: "",
            categoryId: undefined,
            costPrice: "0",
            profitMargin: "0",
            price: "0",
            description: "",
            stocks: branches.map(b => ({
                branchId: b.id,
                quantity: "0"
            }))
        },
    });

    const costPrice = form.watch("costPrice");
    const price = form.watch("price");




    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // Convert strings back to numbers for the API
            const payload = {
                ...values,
                costPrice: parseFloat(values.costPrice) || 0,
                profitMargin: parseFloat(values.profitMargin) || 0,
                price: parseFloat(values.price) || 0,
                stocks: values.stocks?.map(s => ({
                    branchId: s.branchId,
                    quantity: parseFloat(s.quantity) || 0
                }))
            };

            if (isEditing && product) {
                const res = await updateProduct(product.id, payload);
                if (res.success) {
                    toast.success("Producto actualizado");
                    onOpenChange(false);
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            } else {
                const res = await createProduct(payload);
                if (res.success) {
                    toast.success("Producto creado");
                    onOpenChange(false);
                    form.reset();
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            }
        } catch (error) {
            toast.error("Ocurrió un error");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl min-h-[80vh] max-h-[90vh] overflow-y-auto !rounded-none z-[80] p-0">
                <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
                    <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 pt-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* HERO: NAME */}
                            <div className="w-full">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex justify-center uppercase text-xs font-bold text-muted-foreground mb-1">Nombre del Producto</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="NOMBRE DEL PRODUCTO"
                                                    {...field}
                                                    className="text-center font-black text-2xl h-16 uppercase border-2 border-slate-200"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-center" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* CARD 1: IDENTITY (BLUE) */}
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
                                                        <Input {...field} placeholder="COD-001" className="text-center font-mono font-bold h-9 text-white border-blue-200" />
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
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-9 w-full justify-center text-center px-8 relative text-white border-blue-200 font-bold">
                                                                <div className="flex items-center justify-center w-full text-center">
                                                                    <SelectValue placeholder="Seleccionar..." />
                                                                </div>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[200px] z-[100]">
                                                            {categories
                                                                .filter(cat => cat.type === 'PRODUCT')
                                                                .map((cat) => (
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
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">Descripción</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            placeholder="Breve descripción..."
                                                            className="text-center text-xs min-h-[60px] resize-none border-blue-200 focus-visible:ring-blue-500"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* CARD 2: PRICING (GREEN) */}
                                <Card className="border shadow-none">
                                    <CardHeader className="py-3 px-4 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20">
                                        <CardTitle className="text-center text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500">
                                            Finanzas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <FormField
                                            control={form.control}
                                            name="costPrice"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="block text-center text-[10px] font-bold uppercase text-emerald-600">Costo Base</FormLabel>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 font-bold text-emerald-600">$</span>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                {...field}
                                                                onFocus={(e) => e.target.select()}
                                                                className="text-center font-mono font-bold text-lg h-10 border-emerald-200 focus-visible:ring-emerald-500 text-emerald-600"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="block text-center text-[10px] font-bold uppercase text-blue-600">Precio Venta</FormLabel>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 font-bold text-blue-600">$</span>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                {...field}
                                                                onFocus={(e) => e.target.select()}
                                                                className="text-center font-mono font-bold text-lg h-10 border-blue-200 focus-visible:ring-blue-500 text-blue-600"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="profitMargin"
                                            render={({ field }) => (
                                                <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-xl p-3 text-center border-2 border-emerald-200 dark:border-emerald-800 mt-4">
                                                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                                                        Margen Estimado
                                                    </div>
                                                    <div className="font-mono font-black text-xl text-emerald-800 dark:text-emerald-300">
                                                        {field.value}%
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* CARD 3: STOCK (AMBER) */}
                                <Card className="border shadow-none">
                                    <CardHeader className="py-3 px-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20">
                                        <CardTitle className="text-center text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
                                            Stock Inicial
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {branches.map((branch, index) => (
                                                <FormField
                                                    key={branch.id}
                                                    control={form.control}
                                                    name={`stocks.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className={`block text-center text-[10px] font-bold uppercase ${index % 2 === 0 ? 'text-amber-600' : 'text-amber-700'}`}>
                                                                {branch.name}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    {...field}
                                                                    onFocus={(e) => e.target.select()}
                                                                    className="text-center font-bold text-lg h-10 border-amber-200 focus-visible:ring-amber-500 text-white"
                                                                    value={field.value ?? 0}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 text-xs uppercase font-bold tracking-wide">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="h-10 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide">
                                    {isEditing ? "Guardar Cambios" : "Crear Producto"}
                                </Button>
                            </div>

                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog >
    );
}
