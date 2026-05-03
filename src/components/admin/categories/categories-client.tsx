"use client";

import { Category, CategoryType } from "@prisma/client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Boxes, Cpu, Edit, Plus, Search, Tags, Trash2 } from "lucide-react";
import { CategoryDialog } from "./category-dialog";
import { deleteCategory } from "@/actions/categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CategoriesClientProps {
    initialCategories: Category[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | CategoryType>("ALL");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const router = useRouter();

    const categoryStats = useMemo(() => {
        return initialCategories.reduce(
            (acc, category) => {
                acc.total += 1;
                if (category.type === CategoryType.PRODUCT) acc.products += 1;
                if (category.type === CategoryType.PART) acc.parts += 1;
                return acc;
            },
            { total: 0, products: 0, parts: 0 }
        );
    }, [initialCategories]);

    const filteredCategories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return initialCategories.filter((cat) => {
            const matchesType = typeFilter === "ALL" || cat.type === typeFilter;
            const matchesSearch = normalizedSearch.length === 0 || cat.name.toLowerCase().includes(normalizedSearch);
            return matchesType && matchesSearch;
        });
    }, [initialCategories, searchTerm, typeFilter]);

    const handleEdit = (category: Category) => {
        setSelectedCategory(category);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        setCategoryToDelete(id);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;

        try {
            const res = await deleteCategory(categoryToDelete);
            if (res.success) {
                toast.success("Categoría eliminada");
                router.refresh();
            } else {
                toast.error(res.error || "Error al eliminar categoría");
            }
        } catch (error) {
            toast.error("Error inesperado al eliminar categoría");
        } finally {
            setCategoryToDelete(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="grid gap-6 md:grid-cols-3">
                <Card
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === "Enter" && setTypeFilter("ALL")}
                    onClick={() => setTypeFilter("ALL")}
                    className={cn(
                        "relative cursor-pointer overflow-hidden border-none bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg transition-transform hover:-translate-y-0.5",
                        typeFilter === "ALL" && "ring-2 ring-purple-300"
                    )}
                >
                    <CardContent className="flex min-h-[180px] flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-purple-100">Total de categorías</p>
                            <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm"><Tags className="h-6 w-6 text-white" /></div>
                        </div>
                        <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{categoryStats.total}</h3>
                        <div className="mt-auto pt-4 text-sm text-purple-100">Productos y repuestos</div>
                    </CardContent>
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                </Card>
                <Card
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === "Enter" && setTypeFilter(CategoryType.PRODUCT)}
                    onClick={() => setTypeFilter(CategoryType.PRODUCT)}
                    className={cn(
                        "relative cursor-pointer overflow-hidden border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg transition-transform hover:-translate-y-0.5",
                        typeFilter === CategoryType.PRODUCT && "ring-2 ring-blue-300"
                    )}
                >
                    <CardContent className="flex min-h-[180px] flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-blue-100">Categorías de productos</p>
                            <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm"><Boxes className="h-6 w-6 text-white" /></div>
                        </div>
                        <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{categoryStats.products}</h3>
                        <div className="mt-auto pt-4 text-sm text-blue-100">Inventario comercial</div>
                    </CardContent>
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                </Card>
                <Card
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === "Enter" && setTypeFilter(CategoryType.PART)}
                    onClick={() => setTypeFilter(CategoryType.PART)}
                    className={cn(
                        "relative cursor-pointer overflow-hidden border-none bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg transition-transform hover:-translate-y-0.5",
                        typeFilter === CategoryType.PART && "ring-2 ring-amber-200"
                    )}
                >
                    <CardContent className="flex min-h-[180px] flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-amber-100">Categorías de repuestos</p>
                            <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm"><Cpu className="h-6 w-6 text-white" /></div>
                        </div>
                        <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{categoryStats.parts}</h3>
                        <div className="mt-auto pt-4 text-sm text-amber-100">Taller y reparación</div>
                    </CardContent>
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                </Card>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar categorías..."
                        className="h-10 pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => { setSelectedCategory(undefined); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                </Button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold">Nombre</TableHead>
                            <TableHead className="text-center font-semibold">Tipo</TableHead>
                            <TableHead className="text-center font-semibold">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCategories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Search className="h-8 w-8 opacity-20" />
                                        <p>No se encontraron categorías.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCategories.map((category) => (
                                <TableRow key={category.id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-medium text-base">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                {category.type === CategoryType.PRODUCT ? <Boxes className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                                            </span>
                                            <span>{category.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={cn(
                                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border",
                                            category.type === CategoryType.PRODUCT
                                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                        )}>
                                            {category.type === CategoryType.PRODUCT ? "PRODUCTO" : "REPUESTO"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} className="hover:bg-primary/5 hover:text-primary">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(category.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={selectedCategory}
            />

            <AlertDialog open={!!categoryToDelete} onOpenChange={(open: boolean) => !open && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. La categoría será eliminada permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
