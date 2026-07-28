import type { RepairAccessType } from "@/lib/repairs/intake";

import { RepairIntakeSummary } from "./repair-intake-summary";
import { RepairWarrantyInfo } from "./repair-warranty-info";

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
}: RepairDetailsReceptionProps) {
    return (
        <div className="space-y-6">
            <RepairIntakeSummary
                accessType={accessType}
                accessCredential={accessCredential}
                hasSimCard={hasSimCard}
                hasMemoryCard={hasMemoryCard}
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
