import type { CerebroPublicSource, CerebroSource } from "./types";

type MessageInput = {
    role?: unknown;
    content?: unknown;
    parts?: unknown;
};

export type ExtractedMessageInput = { text: string; images: string[] };

export function extractMessageInput(message: MessageInput): ExtractedMessageInput {
    let text = typeof message.content === "string" ? message.content : "";
    const images: string[] = [];
    if (!Array.isArray(message.parts)) return { text: text.trim(), images };

    for (const part of message.parts) {
        if (!part || typeof part !== "object" || !("type" in part)) continue;
        if (part.type === "text" && "text" in part && typeof part.text === "string") {
            text += `${text ? "\n" : ""}${part.text}`;
        }
        if (
            part.type === "file"
            && "mediaType" in part
            && typeof part.mediaType === "string"
            && part.mediaType.startsWith("image/")
            && "url" in part
            && typeof part.url === "string"
        ) {
            images.push(part.url);
        }
    }
    return { text: text.trim(), images };
}

export function toPublicSources(sources: readonly CerebroSource[]): CerebroPublicSource[] {
    return sources.flatMap((source) => {
        if (source.sourceType !== "REPAIR" && source.sourceType !== "PDF") return [];
        return [{
            documentId: source.documentId,
            sourceType: source.sourceType,
            authority: source.authority,
            brand: source.brand,
            model: source.model,
            title: source.title,
            pageNumber: source.pageNumber,
            excerpt: source.content.replace(/\s+/g, " ").trim().slice(0, 260),
        }];
    });
}
