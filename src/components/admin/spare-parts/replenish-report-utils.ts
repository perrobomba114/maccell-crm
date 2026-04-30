import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SparePartWithCategory } from "@/types/spare-parts";

export function handleReplenishReport(initialData: SparePartWithCategory[]) {
    const doc = new jsPDF();

    // Filter items that need replenishment AND have stock in depot
    const replenishItems = initialData
        .filter(item => {
            const needed = item.maxStockLocal - item.stockLocal;
            return needed > 0 && item.stockDepot > 0;
        })
        .map(item => {
            const needed = item.maxStockLocal - item.stockLocal;
            // We can only replenish what we have in depot, or what is needed, whichever is lower
            const toReplenish = Math.min(needed, item.stockDepot);

            return {
                name: item.name,
                replenish: toReplenish,
                stockLocal: item.stockLocal
            };
        });

    if (replenishItems.length === 0) {
        toast.info("No hay productos para reponer con stock en depósito.");
        return;
    }

    const date = new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    // Header
    doc.setFontSize(18);
    doc.text("Reporte de Reposición", 14, 20);

    doc.setFontSize(12);
    doc.text(`Fecha: ${date}`, 14, 30);
    doc.text(`Total items a reponer: ${replenishItems.length}`, 14, 36);

    // Table
    autoTable(doc, {
        startY: 45,
        head: [["Producto", "Stock Local", "A Reponer", "Check"]],
        body: replenishItems.map(item => [
            item.name,
            item.stockLocal,
            item.replenish,
            "" // Cleaning column for check
        ]),
        theme: "striped",
        headStyles: {
            fillColor: [255, 102, 0], // Vignette/Orange pop color (or use brand color)
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            textColor: [50, 50, 50]
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245] // Light gray for zebra
        },
        columnStyles: {
            0: { cellWidth: 80 }, // Name
            1: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: [0, 100, 0] }, // Stock Local (Greenish)
            2: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: [200, 0, 0] }, // Replenish (Reddish)
            3: { cellWidth: 30 }  // Check
        },
        styles: {
            fontSize: 10,
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        }
    });

    // Footer Signatures
    const pageHeight = doc.internal.pageSize.height;
    doc.setLineWidth(0.5);

    // Left Signature
    doc.line(20, pageHeight - 40, 90, pageHeight - 40);
    doc.setFontSize(10);
    doc.text("Responsable de Depósito", 55, pageHeight - 35, { align: "center" });

    // Right Signature
    doc.line(120, pageHeight - 40, 190, pageHeight - 40);
    doc.text("Responsable del Local", 155, pageHeight - 35, { align: "center" });

    doc.save(`reposicion_${date.replace(/\//g, "-")}.pdf`);
    toast.success("PDF generado correctamente");
}
