"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Category } from "@prisma/client";
import { getSparePartsForBuyReport } from "@/actions/spare-parts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ShoppingCart, Loader2 } from "lucide-react";

interface BuyModalProps {
    categories: Category[];
}

export function BuyModal({ categories }: BuyModalProps) {
    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!selectedCategory) {
            toast.error("Seleccione una categoría");
            return;
        }

        setLoading(true);
        try {
            const res = await getSparePartsForBuyReport(selectedCategory);

            if (!res.success || !res.data) {
                toast.error(res.error || "Error al obtener datos");
                setLoading(false);
                return;
            }

            const parts = res.data;

            if (parts.length === 0) {
                toast.info("No hay repuestos para comprar en esta categoría (Stock Local < 10 y Depósito < 10)");
                setLoading(false);
                return;
            }

            // Generate PDF
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });

            const categoryName = categories.find(c => c.id === selectedCategory)?.name || "Todas";

            // Header
            doc.setFontSize(18);
            doc.text("Reporte de Compra", 14, 20);

            doc.setFontSize(12);
            doc.text(`Fecha: ${date}`, 14, 30);
            doc.text(`Categoría: ${categoryName}`, 14, 36);
            doc.text(`Total ítems a comprar: ${parts.length}`, 14, 42);

            // Table
            autoTable(doc, {
                startY: 50,
                head: [["SKU", "Nombre", "Local", "Depósito", "A Comprar", "Costo (USD)"]],
                body: parts.map(item => [
                    item.sku,
                    item.name,
                    item.stockLocal,
                    item.stockDepot,
                    item.quantityToBuy, // Calculated in server action (10 - Local)
                    `$${item.priceUsd.toFixed(2)}`
                ]),
                theme: "striped",
                headStyles: {
                    fillColor: [41, 128, 185], // A nice blue
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    textColor: [50, 50, 50]
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 30 }, // SKU
                    1: { cellWidth: 60 }, // Name
                    2: { cellWidth: 20, halign: 'center' }, // Local
                    3: { cellWidth: 20, halign: 'center' }, // Depot
                    4: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [200, 0, 0] }, // Buy
                    5: { cellWidth: 25, halign: 'right' }   // USD
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                }
            });

            doc.save(`compra_${categoryName.replace(/\s+/g, "_")}_${date.replace(/\//g, "-")}.pdf`);
            toast.success("Reporte generado correctamente");
            setOpen(false);

        } catch (error) {
            console.error(error);
            toast.error("Error al generar reporte");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Compra
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-[80]">
                <DialogHeader>
                    <DialogTitle>Generar Reporte de Compra</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Seleccione una categoría para generar el reporte de repuestos con bajo stock (Local &lt; 10 y Depósito &lt; 10).
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Categoría</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={handleGenerateReport} disabled={loading || !selectedCategory}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                "Generar PDF"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
