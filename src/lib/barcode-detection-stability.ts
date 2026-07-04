export type BarcodeDetectionStabilizerOptions = {
    requiredMatches?: number;
    minLength?: number;
};

export type BarcodeDetectionStabilizer = {
    push: (rawCode: string | null | undefined) => string | null;
    reset: () => void;
};

function normalizeBarcodeCandidate(rawCode: string | null | undefined): string {
    return (rawCode ?? "").trim().toUpperCase();
}

export function createBarcodeDetectionStabilizer(
    options: BarcodeDetectionStabilizerOptions = {},
): BarcodeDetectionStabilizer {
    const requiredMatches = Math.max(1, options.requiredMatches ?? 3);
    const minLength = Math.max(1, options.minLength ?? 4);
    let lastCode = "";
    let matches = 0;

    return {
        push(rawCode) {
            const code = normalizeBarcodeCandidate(rawCode);
            if (code.length < minLength) {
                return null;
            }

            if (code === lastCode) {
                matches += 1;
            } else {
                lastCode = code;
                matches = 1;
            }

            return matches >= requiredMatches ? code : null;
        },
        reset() {
            lastCode = "";
            matches = 0;
        },
    };
}
