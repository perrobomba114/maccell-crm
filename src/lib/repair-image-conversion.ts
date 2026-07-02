import path from "path";
import sharp from "sharp";

const SUPPORTED_INPUT_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/tiff",
    "image/bmp",
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

function isSupportedImageInput(fileName: string, contentType: string) {
    const normalizedContentType = contentType.toLowerCase();
    const extension = path.extname(fileName).toLowerCase();

    return (
        SUPPORTED_INPUT_CONTENT_TYPES.has(normalizedContentType) ||
        SUPPORTED_INPUT_EXTENSIONS.has(extension)
    );
}

export async function convertRepairImageForStorage(input: ConvertRepairImageInput): Promise<ConvertedRepairImage> {
    if (!isSupportedImageInput(input.fileName, input.contentType)) {
        throw new Error("El archivo debe ser una imagen.");
    }

    try {
        const buffer = await sharp(input.buffer, { failOn: "none" })
            .rotate()
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
        throw new Error("No se pudo convertir la imagen. Probá con otra foto o captura.");
    }
}
