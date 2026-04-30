import pdfParse from "pdf-parse";

export const MAX_MSG_CHARS = 900;
export const MAX_PDF_CHARS = 10000;
export const MAX_IMAGES = 4;
export const MAX_OUTPUT_TOKENS = 2048;

export type MessagePart = {
    type?: string;
    image?: string;
    mediaType?: string;
    url?: string;
    text?: string;
    file?: {
        mediaType?: string;
        url?: string;
    };
};

export type MessageLike = {
    role?: string;
    content?: string | MessagePart[];
    parts?: MessagePart[];
};

export function truncate(text: string, max = MAX_MSG_CHARS): string {
    if (!text) return "";
    return text.length <= max ? text : text.slice(0, max) + '...';
}

export async function extractPdfText(dataUrl: string): Promise<string | null> {
    try {
        const base64 = dataUrl.split(',')[1];
        if (!base64) return null;
        const buffer = Buffer.from(base64, 'base64');
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim() || "";
        if (!text) return null;

        const keywords = ["camera", "ldo", "buck", "vcc", "mipi", "u3300", "u2700", "j_cam", "charger", "display", "backlight"];
        const lines = text.split('\n');
        const relevantLines = lines.filter(line =>
            keywords.some(kw => line.toLowerCase().includes(kw))
        ).slice(0, 40);

        const prioritized = `### 📂 DATOS EXTRAÍDOS DEL PLANO:\n${relevantLines.join('\n')}\n\n`;
        const fullContent = prioritized + text;

        return fullContent.length > MAX_PDF_CHARS
            ? fullContent.slice(0, MAX_PDF_CHARS) + '...'
            : fullContent;
    } catch (err: unknown) {
        console.warn('[CEREBRO] ⚠️ Error parseando PDF:', err instanceof Error ? err.message : String(err));
        return null;
    }
}

export function extractImages(message: MessageLike | null | undefined): string[] {
    const images: string[] = [];

    const collectImage = (part: MessagePart) => {
        if (part.type === 'image' && part.image) {
            images.push(part.image);
            return;
        }

        const mediaType = part.mediaType || part.file?.mediaType || '';
        const url = part.url || part.file?.url || '';
        if (part.type === 'file' && mediaType.startsWith('image/') && url) {
            images.push(url);
        }
    };

    if (Array.isArray(message?.parts)) {
        for (const part of message.parts) {
            collectImage(part);
        }
    }

    if (Array.isArray(message?.content)) {
        for (const part of message.content) {
            collectImage(part);
        }
    }

    return images.slice(0, MAX_IMAGES);
}

export function lastUserText(message: MessageLike | null | undefined): string {
    if (!message) return "";
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.parts)) {
        return message.parts.filter((p) => p.type === 'text').map((p) => p.text).join(' ');
    }
    return "";
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
}
