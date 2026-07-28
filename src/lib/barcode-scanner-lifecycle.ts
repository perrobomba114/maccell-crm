export interface BarcodeTrackCapabilities {
    focusMode?: string[];
    zoom?: {
        min: number;
        max: number;
    };
}

type BarcodeTrackConstraintSet = MediaTrackConstraintSet & {
    focusMode?: string;
    zoom?: number;
};

interface BarcodeScannerController<THandler> {
    offDetected: (handler: THandler) => void;
    stop: () => Promise<void>;
}

let cameraTransition: Promise<void> = Promise.resolve();

export function queueBarcodeCameraTransition<T>(operation: () => Promise<T>): Promise<T> {
    const transition = cameraTransition.catch(() => undefined).then(operation);
    cameraTransition = transition.then(() => undefined, () => undefined);
    return transition;
}

export function createBarcodeScannerShutdown<THandler>(
    controller: BarcodeScannerController<THandler>,
    detectedHandler: THandler,
): () => Promise<void> {
    let shutdown: Promise<void> | null = null;

    return () => {
        if (shutdown) return shutdown;

        shutdown = Promise.resolve().then(async () => {
            controller.offDetected(detectedHandler);
            await queueBarcodeCameraTransition(() => controller.stop());
        });
        return shutdown;
    };
}

export function buildBarcodeTrackConstraints(
    capabilities: BarcodeTrackCapabilities,
): MediaTrackConstraints | null {
    const advanced: BarcodeTrackConstraintSet = {};

    if (capabilities.focusMode?.includes("continuous")) {
        advanced.focusMode = "continuous";
    }

    if (capabilities.zoom) {
        const { min, max } = capabilities.zoom;
        advanced.zoom = Math.min(Math.max(1.4, min), max);
    }

    return Object.keys(advanced).length > 0 ? { advanced: [advanced] } : null;
}
