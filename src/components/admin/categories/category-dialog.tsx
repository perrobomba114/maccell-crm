"use client";

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
import { createCategory, updateCategory } from "@/actions/categories";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Category, CategoryType } from "@prisma/client";
import { useEffect } from "react";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "El nombre debe tener al menos 2 caracteres.",
    }),
    type: z.enum([CategoryType.PRODUCT, CategoryType.PART]),
    description: z.string().optional(),
});

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category; // If present, edit mode
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
    const router = useRouter();
    const isEditing = !!category;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: CategoryType.PRODUCT,
            description: "",
        },
    });

    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                type: category.type,
                description: category.description || "",
            });
        } else {
            form.reset({
                name: "",
                type: CategoryType.PRODUCT,
                description: "",
            });
        }
    }, [category, form, open]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (isEditing && category) {
                const res = await updateCategory(category.id, values);
                if (res.success) {
                    toast.success("Categoría actualizada");
                    onOpenChange(false);
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            } else {
                const res = await createCategory(values);
                if (res.success) {
                    toast.success("Categoría creada");
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Modifica los datos de la categoría." : "Agrega una nueva categoría al sistema."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Celulares" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={CategoryType.PRODUCT}>Producto</SelectItem>
                                            <SelectItem value={CategoryType.PART}>Repuesto</SelectItem>
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
                                <FormItem>
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Breve descripción..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">{isEditing ? "Guardar Cambios" : "Crear Categoría"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
