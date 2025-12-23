"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, CheckSquare, Clock, RotateCcw, Pause } from "lucide-react";
import { AssignmentModal } from "./assignment-modal";
import { FinishRepairModal } from "./finish-modal";
import { StartRepairModal } from "./start-repair-modal";
import { startRepairAction, pauseRepairAction } from "@/actions/repairs/technician-actions";
import { toast } from "sonner";

interface TechnicianActionButtonProps {
    repair: any;
    currentUserId: string;
}

export function TechnicianActionButton({ repair, currentUserId }: TechnicianActionButtonProps) {
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // This button is only for "My Repairs" page, so we assume it is assigned to me or we check status.

    // Status 8 (Waiting Confirmation) or 9 (Waiting Spares) -> Show "Reactivar" (Add Time & Restart)
    if (repair.statusId === 8 || repair.statusId === 9) {
        return (
            <>
                <Button
                    size="sm"
                    onClick={() => setShowAssignModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reactivar
                </Button>
                <AssignmentModal
                    repair={repair}
                    currentUserId={currentUserId}
                    isOpen={showAssignModal}
                    onClose={() => setShowAssignModal(false)}
                />
            </>
        );
    }

    // Status 2: Tomado -> Show "Asignarme" (Assign Time)
    if (repair.statusId === 2) {
        return (
            <>
                <Button
                    size="sm"
                    onClick={() => setShowAssignModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                    <Clock className="mr-2 h-4 w-4" />
                    Asignarme
                </Button>
                <AssignmentModal
                    repair={repair}
                    currentUserId={currentUserId}
                    isOpen={showAssignModal}
                    onClose={() => setShowAssignModal(false)}
                />
            </>
        );
    }

    // Status 4: Pausado (Planned) -> Show "Iniciar"
    // Also cover Status 1 just in case, though it shouldn't be here.
    if (repair.statusId === 4) {
        return (
            <>
                <Button
                    size="sm"
                    onClick={() => setShowStartModal(true)}
                    disabled={isLoading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Iniciar
                </Button>
                <StartRepairModal
                    repair={repair}
                    currentUserId={currentUserId}
                    isOpen={showStartModal}
                    onClose={() => setShowStartModal(false)}
                />
            </>
        );
    }

    // Status 3: En Proceso -> Show "Terminar"
    if (repair.statusId === 3) {
        return (
            <>
                <Button
                    size="sm"
                    onClick={() => setShowFinishModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Terminar
                </Button>
                <FinishRepairModal
                    repair={repair}
                    currentUserId={currentUserId}
                    isOpen={showFinishModal}
                    onClose={() => setShowFinishModal(false)}
                />
            </>
        );
    }

    // Other statuses (Finalized) -> Show nothing or status?
    // Usually filtered out or just show Badge.
    return null;
}
