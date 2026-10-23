import path from "path";
import sharp from "sharp";
import decodeHeic from "heic-decode";

export const MAX_REPAIR_IMAGE_BYTES = 30 * 1024 * 1024;
export const MAX_REPAIR_IMAGE_DIMENSION = 4096;

export class RepairImageValidationError extends Error {}

const SUPPORTED_INPUT_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/tiff",
    "image/bmp",
    "image/avif",
]);

const SUPPORTED_INPUT_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
    ".tif",
    ".tiff",
    ".bmp",
    ".avif",
]);

type ConvertRepairImageInput = {
    buffer: Buffer;
    fileName: string;
    contentType: string;
};

type ConvertedRepairImage = {
    buffer: Buffer;
    extension: ".jpg";
    contentType: "image/jpeg";
};

function hasSupportedImageSignature(buffer: Buffer) {
    if (buffer.length < 12) return false;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // PNG
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return true; // WEBP
    if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
        const brands = buffer.subarray(8, Math.min(buffer.length, 80)).toString("ascii");
        if (/heic|heix|hevc|hevx|mif1|msf1|avif|avis/.test(brands)) return true;
    }
    return false;
}

function isSupportedImageInput(fileName: string, contentType: string, buffer: Buffer) {
    const normalizedContentType = contentType.toLowerCase();
    const extension = path.extname(fileName).toLowerCase();

    return (
        SUPPORTED_INPUT_CONTENT_TYPES.has(normalizedContentType) ||
        SUPPORTED_INPUT_EXTENSIONS.has(extension) ||
        hasSupportedImageSignature(buffer)
    );
}

export async function convertRepairImageForStorage(input: ConvertRepairImageInput): Promise<ConvertedRepairImage> {
    if (!isSupportedImageInput(input.fileName, input.contentType, input.buffer)) {
        throw new RepairImageValidationError("El archivo debe ser una imagen.");
    }
    if (input.buffer.length > MAX_REPAIR_IMAGE_BYTES) {
        throw new RepairImageValidationError("Cada foto puede pesar hasta 30 MB. Elegí una foto de menor tamaño.");
    }

    try {
        const source = input.buffer;
        // sharp's prebuilt libvips handles AVIF but lacks the HEVC decoder used
        // by iPhone HEIC photos. Decode these with portable libheif.
        const brands = source.subarray(8, 80).toString("ascii");
        let image: sharp.Sharp;
        if (source.subarray(4, 8).toString("ascii") === "ftyp" && /heic|heix|hevc|hevx|mif1|msf1/.test(brands) && !/avif|avis/.test(brands)) {
            const batch = await decodeHeic.all({ buffer: source });
            try {
                const primary = batch.reduce<typeof batch[number] | undefined>(
                    (best, current) => (!best || current.width * current.height > best.width * best.height ? current : best),
                    batch[0],
                );
                if (!primary || primary.width * primary.height > 80_000_000) throw new Error("La foto supera 80 megapíxeles.");
                const decoded = await primary.decode();
                image = sharp(Buffer.from(decoded.data), { raw: { width: decoded.width, height: decoded.height, channels: 4 } });
            } finally {
                batch.dispose();
            }
        } else {
            image = sharp(source, { failOn: "error", limitInputPixels: 80_000_000 });
        }
        const buffer = await image
            .rotate()
            .resize({ width: MAX_REPAIR_IMAGE_DIMENSION, height: MAX_REPAIR_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
            .jpeg({
                quality: 86,
                mozjpeg: true,
            })
            .toBuffer();

        return {
            buffer,
            extension: ".jpg",
            contentType: "image/jpeg",
        };
    } catch {
        throw new RepairImageValidationError("No se pudo leer la foto. Usá una imagen JPEG, PNG, WEBP o HEIC válida de hasta 80 megapíxeles.");
    }
}
