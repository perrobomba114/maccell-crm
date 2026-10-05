import { REPAIR_STATUS } from "./status";

export function validateFinishParts(statusId: number, requirement: unknown, assignedCount: number): string | null {
    if (statusId === REPAIR_STATUS.PAUSED) return null;
    if (requirement !== "true" && requirement !== "false") return "Confirmá si la reparación requiere repuestos.";
    if (requirement === "true" && assignedCount === 0) {
        return "Asigná un repuesto del local o de proveedor externo, o desactivá Repuesto asignado si no corresponde.";
    }
    return null;
}
