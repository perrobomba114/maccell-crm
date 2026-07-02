"use client";

import { Button } from "@/components/ui/button";
import { cn, isValidImg } from "@/lib/utils";
import { Images } from "lucide-react";

type RepairImagesActionButtonProps = {
    images?: string[] | null;
    ticketNumber: string;
    onClick: () => void;
    layout?: "desktop" | "mobile";
    className?: string;
    disabled?: boolean;
};

export function getRepairImageCount(images?: string[] | null): number {
    return (images ?? []).filter(isValidImg).length;
}

export function RepairImagesActionButton({
    images,
    ticketNumber,
    onClick,
    layout = "desktop",
    className,
    disabled,
}: RepairImagesActionButtonProps) {
    const imageCount = getRepairImageCount(images);
    if (imageCount === 0) return null;

    const label = `Ver ${imageCount} imagen${imageCount === 1 ? "" : "es"} de reparación ${ticketNumber}`;

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative rounded-full text-emerald-600 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300",
                layout === "mobile" ? "size-11" : "size-9",
                className
            )}
        >
            <Images className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-black leading-4 text-white ring-2 ring-background">
                {imageCount}
            </span>
        </Button>
    );
}
