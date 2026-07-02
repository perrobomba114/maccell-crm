"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, isValidImg } from "@/lib/utils";
import type { AdminRepair } from "@/types/admin-repairs";
import { Edit, Eye, Images, Loader2, Trash2 } from "lucide-react";

export type RepairActionKind = "details" | "images";

export type LoadingRepairAction = {
    id: string;
    kind: RepairActionKind;
} | null;

type AdminRepairRowActionsProps = {
    repair: AdminRepair;
    layout: "desktop" | "mobile";
    loadingAction: LoadingRepairAction;
    onOpenDetails: (repairId: string) => void;
    onOpenImages: (repairId: string) => void;
    onEdit: (repairId: string) => void;
    onDelete: (repairId: string) => void;
};

type ActionButtonProps = {
    label: string;
    className?: string;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
    count?: number;
    layout: "desktop" | "mobile";
};

function ActionButton({
    label,
    className,
    disabled,
    onClick,
    children,
    count,
    layout,
}: ActionButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant={layout === "mobile" ? "outline" : "ghost"}
                    size="icon"
                    aria-label={label}
                    title={label}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        "relative rounded-full transition-colors",
                        layout === "mobile" ? "size-11" : "size-9",
                        className
                    )}
                >
                    {children}
                    {typeof count === "number" && count > 0 && (
                        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-4 text-primary-foreground ring-2 ring-background">
                            {count}
                        </span>
                    )}
                    <span className="sr-only">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}

export function AdminRepairRowActions({
    repair,
    layout,
    loadingAction,
    onOpenDetails,
    onOpenImages,
    onEdit,
    onDelete,
}: AdminRepairRowActionsProps) {
    const imageCount = (repair.deviceImages ?? []).filter(isValidImg).length;
    const isLoadingDetails = loadingAction?.id === repair.id && loadingAction.kind === "details";
    const isLoadingImages = loadingAction?.id === repair.id && loadingAction.kind === "images";
    const isBusy = loadingAction?.id === repair.id;
    const isMobile = layout === "mobile";

    return (
        <div
            className={cn(
                "flex items-center",
                isMobile ? "gap-1.5" : "justify-center gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100"
            )}
        >
            <ActionButton
                label={`Ver detalle de reparación ${repair.ticketNumber}`}
                layout={layout}
                disabled={isBusy}
                onClick={() => onOpenDetails(repair.id)}
                className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
                {isLoadingDetails ? <Loader2 className="animate-spin" /> : <Eye />}
            </ActionButton>

            {imageCount > 0 && (
                <ActionButton
                    label={`Ver ${imageCount} imagen${imageCount === 1 ? "" : "es"} de reparación ${repair.ticketNumber}`}
                    layout={layout}
                    disabled={isBusy}
                    onClick={() => onOpenImages(repair.id)}
                    count={imageCount}
                    className="text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                    {isLoadingImages ? <Loader2 className="animate-spin" /> : <Images />}
                </ActionButton>
            )}

            <ActionButton
                label={`Editar reparación ${repair.ticketNumber}`}
                layout={layout}
                disabled={isBusy}
                onClick={() => onEdit(repair.id)}
                className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
                <Edit />
            </ActionButton>

            <ActionButton
                label={`Eliminar reparación ${repair.ticketNumber}`}
                layout={layout}
                disabled={isBusy}
                onClick={() => onDelete(repair.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
                <Trash2 />
            </ActionButton>
        </div>
    );
}
