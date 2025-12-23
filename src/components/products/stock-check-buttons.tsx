"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { confirmStock } from "@/lib/actions/stock-actions";
import { DiscrepancyModal } from "./discrepancy-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StockCheckButtonsProps {
    stockId: string;
    productName: string;
    quantity: number;
    userId: string;
    lastCheckedAt: Date | null;
}

export function StockCheckButtons({
    stockId,
    productName,
    quantity,
    userId,
    lastCheckedAt
}: StockCheckButtonsProps) {
    const [isPending, startTransition] = useTransition();
    const [showModal, setShowModal] = useState(false);

    // Visual feedback helper
    const isCheckedRecently = lastCheckedAt &&
        (new Date().getTime() - new Date(lastCheckedAt).getTime() < 24 * 60 * 60 * 1000); // Checked in last 24h

    const handleConfirm = () => {
        startTransition(async () => {
            const result = await confirmStock(stockId);
            if (result.success) {
                toast.success("Stock Verificado");
            } else {
                toast.error("No se pudo guardar el control.");
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                size="sm"
                variant={isCheckedRecently ? "default" : "outline"} // Outline if not checked today
                className={cn(
                    "w-8 h-8 p-0",
                    isCheckedRecently ? "bg-green-600 hover:bg-green-700" : "border-green-600 text-green-600 hover:bg-green-50"
                )}
                onClick={handleConfirm}
                disabled={isPending}
                title="Confirmar Stock Correcto"
            >
                <Check className="h-4 w-4" />
            </Button>

            <Button
                size="sm"
                variant="outline"
                className="w-8 h-8 p-0 border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => setShowModal(true)}
                disabled={isPending}
                title="Reportar Diferencia"
            >
                <X className="h-4 w-4" />
            </Button>

            <DiscrepancyModal
                stockId={stockId}
                productName={productName}
                currentQuantity={quantity}
                userId={userId}
                open={showModal}
                onOpenChange={setShowModal}
                onSuccess={() => {
                    // Start transition to refresh if needed, but Modal handles toast
                }}
            />
        </div>
    );
}
