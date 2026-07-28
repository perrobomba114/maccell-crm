import type { RepairAccessType } from "@/lib/repairs/intake";

import { RepairIntakeSummary } from "./repair-intake-summary";
import { RepairWarrantyInfo } from "./repair-warranty-info";
import { cn } from "@/lib/utils";

interface RepairDetailsReceptionProps {
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard?: boolean | null;
    hasMemoryCard?: boolean | null;
    isWarranty?: boolean;
    originalRepair?: {
        id?: string;
        ticketNumber: string;
        problemDescription: string;
        assignedTo?: { name?: string | null } | null;
        statusHistory?: {
            user?: { name?: string | null; role?: string | null } | null;
        }[];
    } | null;
    warrantyRepairs?: {
        id: string;
        ticketNumber: string;
        problemDescription: string;
    }[];
    onOpenRepair?: (repairId: string) => void;
    fillHeight?: boolean;
}

export function RepairDetailsReception({
    accessType,
    accessCredential,
    hasSimCard,
    hasMemoryCard,
    isWarranty,
    originalRepair,
    warrantyRepairs,
    onOpenRepair,
    fillHeight = false,
}: RepairDetailsReceptionProps) {
    const hasWarrantyInformation = Boolean(isWarranty ? originalRepair : warrantyRepairs?.[0]);

    return (
        <div className={cn("space-y-3", fillHeight && "h-full")}>
            <RepairIntakeSummary
                accessType={accessType}
                accessCredential={accessCredential}
                hasSimCard={hasSimCard}
                hasMemoryCard={hasMemoryCard}
                fillHeight={fillHeight && !hasWarrantyInformation}
            />
            <RepairWarrantyInfo
                isWarranty={isWarranty}
                originalRepair={originalRepair}
                warrantyRepairs={warrantyRepairs}
                onOpenRepair={onOpenRepair}
            />
        </div>
    );
}
