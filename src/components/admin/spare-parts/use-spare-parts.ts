import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SparePartWithCategory } from "@/types/spare-parts";
import { deleteSparePart, replenishSparePart, decrementStockLocal } from "@/actions/spare-parts";

export function useSpareParts(initialData: SparePartWithCategory[]) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    useEffect(() => {
        const query = searchParams.get("query");
        if (query) {
            setSearchTerm(query);
            setCurrentPage(1);
        }
    }, [searchParams]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (column: string) => {
        const currentSort = searchParams.get("sort");
        const currentOrder = searchParams.get("order");
        const newOrder = currentSort === column && currentOrder === "asc" ? "desc" : "asc";
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", column);
        params.set("order", newOrder);
        router.push(`?${params.toString()}`);
    };

    const filteredData = initialData.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (currentPage > 1 && totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(1);
    }

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<SparePartWithCategory | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [replenishData, setReplenishData] = useState<{ part: SparePartWithCategory, quantity: number } | null>(null);
    const [decrementData, setDecrementData] = useState<{ part: SparePartWithCategory } | null>(null);

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const res = await deleteSparePart(deletingId);
            if (res.success) {
                toast.success("Repuesto eliminado");
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Error al eliminar");
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleConfirmReplenish = async () => {
        if (!replenishData) return;
        try {
            const res = await replenishSparePart(replenishData.part.id, replenishData.quantity);
            if (res.success) {
                toast.success(`Se repuso ${replenishData.quantity}u de ${replenishData.part.name} con éxito`);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Error al reponer");
            console.error(error);
        } finally {
            setReplenishData(null);
        }
    };

    const handleConfirmDecrement = async () => {
        if (!decrementData) return;
        try {
            const res = await decrementStockLocal(decrementData.part.id);
            if (res.success) {
                toast.success(`Se descontó 1 unidad de ${decrementData.part.name}`);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Error al descontar");
            console.error(error);
        } finally {
            setDecrementData(null);
        }
    };

    return {
        searchTerm,
        handleSearchChange,
        currentPage,
        setCurrentPage,
        totalPages,
        paginatedData,
        handleSort,
        isCreateOpen,
        setIsCreateOpen,
        editingPart,
        setEditingPart,
        deletingId,
        setDeletingId,
        replenishData,
        setReplenishData,
        decrementData,
        setDecrementData,
        handleDelete,
        handleConfirmReplenish,
        handleConfirmDecrement,
        router,
        searchParams
    };
}
