export function keepScannerOpenOnImplicitDialogChange(
    currentOpen: boolean,
    requestedOpen: boolean,
): boolean {
    return currentOpen || requestedOpen;
}
