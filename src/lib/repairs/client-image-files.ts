export const MAX_CLIENT_REPAIR_IMAGES = 3;
export const MAX_CLIENT_REPAIR_IMAGE_BYTES = 30 * 1024 * 1024;

export type MaterializeRepairImagesResult =
    | { ok: true; files: File[] }
    | { ok: false; error: string };

/**
 * Copies selected browser File blobs into memory immediately upon selection.
 * On mobile browsers (iOS Safari / Android Chrome), clearing `<input type="file">`
 * (`e.target.value = ""`) or unmounting the input before FormData submission can
 * invalidate temporary camera/content-URI file handles and cause `fetch()` to throw.
 */
export async function materializeRepairImageFiles(
    selectedFiles: Iterable<File>,
    existingCount: number = 0,
    maxTotal: number = MAX_CLIENT_REPAIR_IMAGES,
): Promise<MaterializeRepairImagesResult> {
    const incoming = Array.from(selectedFiles);
    if (incoming.length === 0) {
        return { ok: true, files: [] };
    }

    if (existingCount + incoming.length > maxTotal) {
        return { ok: false, error: `Máximo ${maxTotal} imágenes.` };
    }

    const materialized: File[] = [];
    for (let i = 0; i < incoming.length; i++) {
        const file = incoming[i];
        if (!file || file.size <= 0) {
            return { ok: false, error: "Una de las fotos seleccionadas está vacía o no está disponible." };
        }
        if (file.size > MAX_CLIENT_REPAIR_IMAGE_BYTES) {
            return { ok: false, error: "Cada foto puede pesar hasta 30 MB. Elegí una foto de menor tamaño." };
        }
        try {
            const bytes = await file.arrayBuffer();
            if (bytes.byteLength <= 0) {
                return { ok: false, error: "Una de las fotos seleccionadas está vacía o no está disponible." };
            }
            materialized.push(
                new File([bytes], file.name || `evidencia-${existingCount + i + 1}.jpg`, {
                    type: file.type || "application/octet-stream",
                    lastModified: file.lastModified || Date.now(),
                }),
            );
        } catch {
            return {
                ok: false,
                error: "No se pudo leer la foto desde el dispositivo. Intentá seleccionarla o tomarla nuevamente.",
            };
        }
    }

    return { ok: true, files: materialized };
}
