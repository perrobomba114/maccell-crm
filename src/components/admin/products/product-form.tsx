"use client";
import { Package, DollarSign, Store } from "lucide-react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
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
import { createProduct, updateProduct } from "@/actions/products";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Category, Product, Branch } from "@prisma/client";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
    name: z.string().min(2, "El nombre es requerido."),
    sku: z.string().min(1, "El SKU es requerido."),
    categoryId: z.string().optional(),
    costPrice: z.coerce.number().min(0, "El costo debe ser mayor o igual a 0"),
    profitMargin: z.coerce.number().min(0, "El margen debe ser mayor o igual a 0"),
    price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
    description: z.string().optional(),
    stocks: z.array(z.object({
        branchId: z.string(),
        quantity: z.coerce.number().min(0)
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
        defaultValues: {
            name: product?.name || "",
            sku: product?.sku || "",
            categoryId: product?.categoryId || undefined,
            costPrice: product?.costPrice || 0,
            profitMargin: product?.profitMargin || 0,
            price: product?.price || 0,
            description: product?.description || "",
            stocks: product && (product as any).stock
                ? branches.map(b => ({
                    branchId: b.id,
                    quantity: (product as any).stock.find((s: any) => s.branchId === b.id)?.quantity ?? 0
                }))
                : branches.map(b => ({ branchId: b.id, quantity: 0 }))
        },
    });

    const costPrice = form.watch("costPrice");
    const price = form.watch("price");

    useEffect(() => {
        if (costPrice > 0 && price > 0) {
            const margin = ((price - costPrice) / costPrice) * 100;
            // Avoid infinite loop if values are close enough
            const currentMargin = form.getValues("profitMargin");
            if (Math.abs(margin - currentMargin) > 0.1) {
                form.setValue("profitMargin", Math.round(margin));
            }
        }
    }, [costPrice, price, form]);

    const productId = product?.id;
    useEffect(() => {
        if (open) {
            form.reset({
                name: product?.name || "",
                sku: product?.sku || "",
                categoryId: product?.categoryId || undefined,
                costPrice: product?.costPrice || 0,
                profitMargin: product?.profitMargin || 0,
                price: product?.price || 0,
                description: product?.description || "",
                stocks: product && (product as any).stock
                    ? branches.map(b => ({
                        branchId: b.id,
                        quantity: (product as any).stock.find((s: any) => s.branchId === b.id)?.quantity ?? 0
                    }))
                    : branches.map(b => ({ branchId: b.id, quantity: 0 }))
            });
        }
    }, [productId, open, branches.length]); // Use ID and length to avoid reset on branch data refresh if content is same

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (isEditing && product) {
                // Now we include stocks in the update
                const res = await updateProduct(product.id, values);
                if (res.success) {
                    toast.success("Producto actualizado");
                    onOpenChange(false);
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            } else {
                const res = await createProduct(values);
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
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto !rounded-none">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Modifica los detalles del producto." : "Agrega un nuevo producto al catálogo global."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Left Column: General Info (7/12) */}
                            <div className="md:col-span-7 space-y-4">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-700 dark:text-blue-400">
                                    <div className="h-6 w-1 rounded-full bg-blue-600 dark:bg-blue-500" />
                                    Información General
                                </h3>

                                <div className="grid grid-cols-12 gap-3">
                                    {/* SKU */}
                                    <div className="col-span-4">
                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SKU</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="COD-001" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    {/* Category */}
                                    <div className="col-span-8">
                                        <FormField
                                            control={form.control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Categoría</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {categories
                                                                .filter(cat => cat.type === 'PRODUCT')
                                                                .map((cat) => (
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

                                    {/* Name */}
                                    <div className="col-span-12">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombre del Producto</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej: iPhone 13 Pro Max" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="col-span-12">
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Descripción</FormLabel>
                                                    <FormControl>
                                                        <Textarea className="min-h-[85px] resize-none" placeholder="Detalles técnicos..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Pricing & Costs (5/12) */}
                            <div className="md:col-span-5 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                                        <div className="h-6 w-1 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                                        Precios y Márgenes
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="costPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Costo Base</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="100"
                                                            {...field}
                                                            value={field.value ?? ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                                field.onChange(val);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Precio Venta</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="100"
                                                            {...field}
                                                            value={field.value ?? ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                                field.onChange(val);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="profitMargin"
                                                render={({ field }) => (
                                                    <div className="flex justify-between items-center p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                                        <FormLabel className="mb-0">Margen Estimado</FormLabel>
                                                        <span className={`text-lg font-bold ${Number(field.value) >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                            {field.value}%
                                                        </span>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
                                        <div className="h-6 w-1 rounded-full bg-amber-600 dark:bg-amber-500" />
                                        Stock Inicial
                                    </h3>

                                    <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/40">
                                                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                                    <TableHead className="h-9">Sucursal</TableHead>
                                                    <TableHead className="h-9 w-24 text-right">Cant.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {branches.map((branch, index) => (
                                                    <TableRow key={branch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                        <TableCell className="py-2 font-medium text-slate-700 dark:text-slate-300">{branch.name}</TableCell>
                                                        <TableCell className="py-2 text-right">
                                                            <FormField
                                                                control={form.control}
                                                                name={`stocks.${index}.quantity`}
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-0">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                className="text-right h-8"
                                                                                {...field}
                                                                                value={field.value ?? 0}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                                                    field.onChange(val);
                                                                                }}
                                                                                onFocus={(e) => e.target.select()}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit">{isEditing ? "Guardar Cambios" : "Crear Producto"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
