"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type TextUIPart, type UIMessage } from "ai";
import { useCallback, useState } from "react";

import { readCerebroApiError } from "@/lib/cerebro-v2/transport";
import type { CerebroMessageMetadata } from "@/lib/cerebro-v2/types";

export type CerebroUiMessage = UIMessage<CerebroMessageMetadata>;

type UseCerebroV2ChatInput = {
    sessionId: string;
    brand: string;
    model: string;
    initialMessages: CerebroUiMessage[];
    onConversationUpdated: () => void;
};

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);
    if (!response.ok) throw new Error(await readCerebroApiError(response));
    return response;
}

async function filePart(file: File): Promise<FileUIPart> {
    if (!file.type.startsWith("image/")) throw new Error("Solo se pueden adjuntar imágenes");
    if (file.size > 4 * 1024 * 1024) throw new Error("Cada imagen debe pesar menos de 4 MB");
    const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagen inválida"));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
    });
    return { type: "file", mediaType: file.type, filename: file.name, url };
}

export function useCerebroV2Chat(input: UseCerebroV2ChatInput) {
    const [clientError, setClientError] = useState<string | null>(null);
    const chat = useChat<CerebroUiMessage>({
        id: input.sessionId,
        messages: input.initialMessages,
        transport: new DefaultChatTransport<CerebroUiMessage>({
            api: "/api/cerebro-v2/chat",
            fetch: apiFetch,
        }),
        onError: (error) => setClientError(error.message),
        onFinish: () => input.onConversationUpdated(),
    });

    const send = useCallback(async (text: string, files: readonly File[]) => {
        setClientError(null);
        chat.clearError();
        if (!input.model.trim()) {
            setClientError("Seleccioná marca y modelo antes de consultar");
            return false;
        }
        if (!text.trim() && files.length === 0) return false;
        if (files.length > 5) {
            setClientError("Podés adjuntar hasta 5 imágenes");
            return false;
        }
        try {
            const fileParts = await Promise.all(files.map(filePart));
            const parts: Array<TextUIPart | FileUIPart> = [];
            if (text.trim()) parts.push({ type: "text", text: text.trim() });
            parts.push(...fileParts);
            const clientMessageId = crypto.randomUUID();
            await chat.sendMessage(
                { id: clientMessageId, role: "user", parts },
                {
                    body: {
                        sessionId: input.sessionId,
                        clientMessageId,
                        deviceContext: { brand: input.brand, model: input.model },
                    },
                },
            );
            return true;
        } catch (error) {
            setClientError(error instanceof Error ? error.message : "No se pudo enviar la consulta");
            return false;
        }
    }, [chat, input.brand, input.model, input.sessionId]);

    return {
        messages: chat.messages,
        status: chat.status,
        error: clientError ?? chat.error?.message ?? null,
        send,
        stop: chat.stop,
        clearError: () => { setClientError(null); chat.clearError(); },
    };
}
