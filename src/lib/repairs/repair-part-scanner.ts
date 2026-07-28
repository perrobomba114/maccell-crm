export function shouldContinueRepairPartScanning(selectedCount: number, maxParts: number): boolean {
    return selectedCount + 1 < maxParts;
}
