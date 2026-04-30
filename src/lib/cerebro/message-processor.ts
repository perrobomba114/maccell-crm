import { truncate, extractPdfText, lastUserText, type MessageLike, type MessagePart } from "./utils";
import type { ModelMessage } from "ai";

const MAX_HISTORY_MSGS = 6;

type CoreRole = Extract<ModelMessage["role"], "user" | "assistant">;

type VisionContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string };

function textFromPart(part: MessagePart): string {
    return part.type === "text" && typeof part.text === "string" ? part.text : "";
}

function normalizeRole(role: string | undefined): CoreRole {
    return role === "assistant" ? "assistant" : "user";
}

export async function normalizeHistory(messages: MessageLike[]): Promise<ModelMessage[]> {
    const result: ModelMessage[] = [];
    for (const m of messages) {
        let textContent = '';
        if (typeof m.content === 'string' && m.content?.trim()) textContent = m.content;
        if (Array.isArray(m.parts)) {
            textContent = m.parts.map(textFromPart).filter(Boolean).join(' ');
        }
        if (Array.isArray(m.content)) {
            textContent = m.content.map(textFromPart).filter(Boolean).join(' ');
        }
        const finalText = truncate(textContent?.trim() || '');
        const role = normalizeRole(m.role);
        result.push({ role, content: finalText || (role === 'user' ? 'Medición solicitada' : '...') });
    }
    return result;
}

export async function parseLastMessage(msg: MessageLike): Promise<{ text: string, pdfTexts: string[] }> {
    let textContent = '';
    const pdfTexts: string[] = [];
    if (Array.isArray(msg.parts)) {
        for (const p of msg.parts) {
            if (p.type === 'text' && p.text) textContent += p.text + ' ';
            if (p.type === 'file') {
                const mt = p.mediaType || p.file?.mediaType || '';
                const url = p.url || p.file?.url || '';
                if (mt === 'application/pdf' && url) {
                    const pdf = await extractPdfText(url);
                    if (pdf) pdfTexts.push(pdf);
                }
            }
        }
    }
    if (typeof msg.content === 'string' && msg.content?.trim()) textContent = msg.content;
    if (Array.isArray(msg.content)) {
        textContent = msg.content.map(textFromPart).filter(Boolean).join(' ');
    }
    textContent = truncate(textContent?.trim() || '');
    return { text: textContent, pdfTexts };
}

export async function buildVisionMessages(coreMessages: MessageLike[], images: string[]): Promise<ModelMessage[]> {
    const lastMsg = coreMessages[coreMessages.length - 1];
    let text = "Analizá esta imagen técnica.";
    const rawContent = typeof lastMsg?.content === 'string' ? lastMsg.content : lastUserText(lastMsg);
    if (rawContent) text = rawContent;

    const content: VisionContentPart[] = [{ type: 'text', text }];
    for (const img of images) {
        content.push({ type: 'image', image: img });
    }
    return [{ role: 'user', content }];
}

export async function toCoreMsgs(messages: MessageLike[]): Promise<ModelMessage[]> {
    try {
        const lastMsg = messages[messages.length - 1];
        const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);

        const result = await normalizeHistory(history);

        const { text, pdfTexts } = await parseLastMessage(lastMsg);
        let finalContent = text;
        if (pdfTexts.length > 0) {
            const pdfBlock = pdfTexts.map((t, i) => `\n\n📄 [SCHEMATIC/PDF #${i + 1}]:\n${t}`).join('\n');
            finalContent = finalContent + pdfBlock;
        }

        const role = normalizeRole(lastMsg.role);
        result.push({ role, content: finalContent || (role === 'user' ? 'Analizar' : '...') });
        return result;
    } catch (e) {
        console.error("[CEREBRO] toCoreMsgs error:", e);
        return [{ role: 'user', content: 'Error procesando mensajes' }];
    }
}
