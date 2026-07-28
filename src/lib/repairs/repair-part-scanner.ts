export function shouldContinueRepairPartScanning(selectedCount: number, maxParts: number): boolean {
    return selectedCount + 1 < maxParts;
}

export function keepScannerOpenOnImplicitDialogChange(
    currentOpen: boolean,
    requestedOpen: boolean,
): boolean {
    return currentOpen || requestedOpen;
}
