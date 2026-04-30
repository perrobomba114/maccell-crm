import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { saveMessagesToDbAction, saveUserMessageAction, updateConversationTitleAction } from "@/actions/cerebro-actions";

type CerebroFilePart = {
    type: "file";
    filename?: string;
    mediaType: string;
    url: string;
};

type CerebroMessagePart = UIMessage["parts"][number] & {
    type?: string;
    text?: string;
    url?: string;
    file?: {
        url?: string;
    };
};

type ChatFinishPayload = {
    messages?: UIMessage[];
};

interface UseCerebroChatProps {
    conversationId: string;
    initialMessages?: UIMessage[];
    mode: "STANDARD" | "MENTOR";
    deviceContext: { brand: string; model: string };
}

export function useCerebroChat({ conversationId, initialMessages = [], mode, deviceContext }: UseCerebroChatProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [tokenUsage, setTokenUsage] = useState<{ used: number; limit: number; remaining: number; percentage: number; resetAt: string } | null>(null);
    const [atBottom, setAtBottom] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/cerebro/tokens");
                if (res.ok) setTokenUsage(await res.json());
            } catch (err) {
                console.warn("[CEREBRO] Token usage fetch failed:", err instanceof Error ? err.message : String(err));
            }
        };
        fetch_();
        const interval = setInterval(fetch_, 30_000);
        return () => clearInterval(interval);
    }, []);

    // Quick prompt from landing chips
    useEffect(() => {
        const handler = (e: Event) => {
            const ev = e as CustomEvent;
            if (ev.detail?.prompt) {
                setInput(ev.detail.prompt);
                setTimeout(() => textareaRef.current?.focus(), 100);
            }
        };
        window.addEventListener("cerebro-quick-prompt", handler);
        return () => window.removeEventListener("cerebro-quick-prompt", handler);
    }, []);

    const { messages, sendMessage, stop, status, error } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport: new DefaultChatTransport({
            api: "/api/cerebro/chat",
            body: {
                guidedMode: mode === "MENTOR",
                deviceContext
            }
        }),
        onFinish: async ({ messages: allMessages }: ChatFinishPayload) => {
            try {
                const finishedMessages = allMessages || [];
                if (finishedMessages.length > 0) {
                    await saveMessagesToDbAction(conversationId, finishedMessages.map((m) => {
                        const parts = (m.parts || []) as CerebroMessagePart[];
                        const textContent = parts.filter((p) => p.type === "text").map((p) => p.text || "").join("") || "";
                        const mediaUrls = parts.filter((p) => p.type === "file").map((p) => p.url || p.file?.url || "").filter(Boolean);
                        return { role: m.role as "user" | "assistant", content: textContent, mediaUrls };
                    }));
                    if (finishedMessages.length <= 2) {
                        const firstUser = finishedMessages.find((m) => m.role === "user");
                        if (firstUser) {
                            const parts = (firstUser.parts || []) as CerebroMessagePart[];
                            const raw = parts.filter((p) => p.type === "text").map((p) => p.text || "").join("");
                            const title = raw.substring(0, 40).trim() + (raw.length > 40 ? "..." : "");
                            if (title) await updateConversationTitleAction(conversationId, title);
                        }
                    }
                }
            } catch (err) { console.error("Error saving:", err); }
        },
        onError: (err: Error) => {
            console.error("⛔ [CEREBRO_CLIENT_ERROR]:", err);
            toast.error("Error de conexión: " + (err.message || "Ver consola"));
        },
    });

    const isLoading = status === "submitted" || status === "streaming";

    useEffect(() => {
        if (atBottom && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, status, atBottom]);

    const handleScroll = useCallback(() => {
        const vp = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
        if (!vp) return;
        setAtBottom(vp.scrollHeight - vp.scrollTop - vp.clientHeight < 80);
    }, []);

    const adjustTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    };

    const submit = async (text: string, extraFiles?: File[]) => {
        const currentFiles = extraFiles || files;
        if ((!text.trim() && currentFiles.length === 0) || isLoading) return;
        setInput("");
        setFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setAtBottom(true);
        const fileParts: CerebroFilePart[] = await Promise.all(currentFiles.map(async (file) => {
            const dataUrl = await new Promise<string>((resolve) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.readAsDataURL(file);
            });
            return { type: "file" as const, filename: file.name, mediaType: file.type || "application/octet-stream", url: dataUrl };
        }));
        saveUserMessageAction(conversationId, text, fileParts.map(f => f.url), !initialMessages?.length).catch(console.error);
        sendMessage({ text, files: fileParts.length > 0 ? fileParts : undefined });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };

    const removeFile = (i: number) => setFiles(prev => prev.filter((_, j) => i !== j));

    const handleSummarize = async () => {
        if (messages.length === 0) return;
        setIsSummarizing(true);
        try {
            const res = await fetch("/api/cerebro/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages })
            });
            const data = await res.json();
            if (res.ok && data.summary) {
                window.dispatchEvent(new CustomEvent("cerebro-save-wiki", { detail: { content: data.summary } }));
                toast.success("Resumen técnico generado.");
            } else {
                toast.error(data.error || "Error al resumir.");
            }
        } catch {
            toast.error("Error de conexión al resumir.");
        } finally {
            setIsSummarizing(false);
        }
    };

    return {
        input, setInput,
        files, setFiles,
        fileInputRef,
        isSummarizing,
        selectedImage, setSelectedImage,
        zoom, setZoom,
        tokenUsage,
        atBottom, setAtBottom,
        scrollRef,
        bottomRef,
        textareaRef,
        messages,
        isLoading,
        error,
        stop,
        submit,
        handleScroll,
        adjustTextarea,
        handleFileChange,
        removeFile,
        handleSummarize
    };
}
