"use client";

import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, BrainCircuit, RefreshCw, Image as ImageIcon, X, FileIcon } from "lucide-react";
import { saveMessagesToDbAction, updateConversationTitleAction, generateGeminiPromptAction } from "@/actions/cerebro-actions";
import { toast } from "sonner";

interface CerebroChatProps {
    conversationId: string;
    initialMessages?: UIMessage[];
}

export function CerebroChat({ conversationId, initialMessages = [] }: CerebroChatProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);


    const { messages, sendMessage, stop, status, error } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport: new DefaultChatTransport({ api: "/api/cerebro/chat" }),
        onFinish: async ({ message, messages: allMessages }: any) => {
            try {
                if (allMessages && allMessages.length > 0) {
                    await saveMessagesToDbAction(conversationId, allMessages.map((m: any) => {
                        // En AI SDK v6 el texto está en parts, no en m.content
                        const textContent = m.parts
                            ?.filter((p: any) => p.type === 'text')
                            .map((p: any) => p.text || '')
                            .join('') || m.content || m.text || '';

                        // Extraer imágenes de las partes
                        const mediaUrls = m.parts
                            ?.filter((p: any) => p.type === 'file')
                            .map((p: any) => p.url || p.file?.url || '')
                            .filter(Boolean) || [];

                        return {
                            role: m.role as "user" | "assistant",
                            content: textContent,
                            mediaUrls
                        };
                    }));

                    if (allMessages.length <= 2) {
                        const firstUserMessage = allMessages.find((m: any) => m.role === 'user');
                        if (firstUserMessage) {
                            // Extraer texto del primer mensaje del usuario
                            const rawContent = firstUserMessage.parts
                                ?.filter((p: any) => p.type === 'text')
                                .map((p: any) => p.text || '')
                                .join('') || firstUserMessage.content || firstUserMessage.text || '';
                            const cleanTitle = rawContent.substring(0, 40).trim() + (rawContent.length > 40 ? "..." : "");
                            if (cleanTitle) {
                                await updateConversationTitleAction(conversationId, cleanTitle);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error saving messages/updating title:", err);
            }
        }
    } as any);

    const isLoading = status === "submitted" || status === "streaming";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((input.trim() || files.length > 0) && !isLoading) {
            const currentInput = input;
            const currentFiles = [...files];

            setInput('');
            setFiles([]);

            const fileParts = await Promise.all(currentFiles.map(async (file) => {
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                return {
                    type: 'file' as const,
                    filename: file.name,
                    mediaType: file.type,
                    url: dataUrl
                };
            }));

            sendMessage({
                text: currentInput,
                files: fileParts.length > 0 ? fileParts : undefined
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, status]);


    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm">Cerebro AI</h2>
                        <p className="text-slate-400 text-xs text-violet-300">Conectado a BD MACCELL</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
                <div className="p-4 space-y-6 w-full mx-auto pb-4">
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 text-sm">
                            <BrainCircuit size={64} className="mb-4 text-violet-500/50" />
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Asistente Virtual Disponible</h3>
                            <p className="text-center max-w-md mb-6 text-slate-400">
                                Escribí el síntoma del dispositivo y te daré diagnósticos cruzados con la base de datos de MACCELL.
                            </p>
                        </div>
                    )}

                    {messages.map((message: any) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${message.role === "user" ? "bg-emerald-600 shadow-emerald-900 shadow-lg" : "bg-violet-600 shadow-violet-900 shadow-lg"
                                }`}>
                                {message.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                            </div>

                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${message.role === "user"
                                ? "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tr-sm"
                                : "bg-slate-950/80 text-slate-300 border border-violet-900/30 rounded-tl-sm shadow-inner"
                                }`}>

                                <div className="flex flex-col gap-3">
                                    {(message.parts || []).map((part: any, index: number) => {
                                        if (part.type === 'text') {
                                            return <div key={index} className="whitespace-pre-wrap">{part.text}</div>;
                                        }
                                        if (part.type === 'file') {
                                            const isImage = part.file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(part.file.name || '');
                                            return (
                                                <div key={index} className="mt-1">
                                                    {isImage ? (
                                                        <img
                                                            src={part.file.url || (part.file.data ? `data:${part.file.type};base64,${part.file.data}` : '')}
                                                            alt={part.file.name}
                                                            className="max-w-full rounded-lg border border-slate-700 overflow-hidden shadow-md"
                                                            style={{ maxHeight: '300px' }}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700 text-xs">
                                                            <FileIcon size={14} className="text-slate-400" />
                                                            <span className="truncate">{part.file.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                    {!message.parts && message.content && (() => {
                                        const content = message.content;
                                        if (message.role === 'user') return <div className="whitespace-pre-wrap">{content}</div>;

                                        const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                                        const hasThink = !!thinkMatch;
                                        const thinkContent = hasThink ? thinkMatch[1].trim() : '';
                                        const mainContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

                                        return (
                                            <>
                                                {hasThink && (
                                                    <details className="mb-3 mt-1 group" open={!content.includes('</think>')}>
                                                        <summary className="text-[11px] text-slate-500 font-medium cursor-pointer flex items-center gap-1.5 hover:text-slate-300 transition-colors select-none">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${content.includes('</think>') ? 'bg-emerald-500/50' : 'bg-violet-500/80 animate-pulse'}`} />
                                                            {content.includes('</think>') ? 'Análisis lógico completado' : 'Analizando hardware (DeepSeek Reasoning)...'}
                                                        </summary>
                                                        <div className="mt-2 mb-2 text-[11.5px] text-slate-400 border-l-2 border-violet-900/50 pl-3 py-1.5 bg-slate-950/30 rounded-r-md">
                                                            <div className="whitespace-pre-wrap font-mono leading-relaxed">{thinkContent}</div>
                                                        </div>
                                                    </details>
                                                )}
                                                {mainContent && (
                                                    <div className="whitespace-pre-wrap text-[14px]">{mainContent}</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3 flex-row">
                            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 bg-violet-600 shadow-violet-900 shadow-lg animate-pulse">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-violet-900/30 rounded-tl-sm flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-violet-400">
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span className="text-xs font-medium">Pensando diagnóstico...</span>
                                </div>
                            </div>
                        </div>
                    )}



                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs">
                            Hubo un problema con la conexión. Por favor reintentá en unos segundos.
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
                <form
                    onSubmit={onSubmit}
                    className="flex flex-col gap-2 w-full mx-auto"
                >
                    {/* File Previews */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
                            {files.map((file, i) => (
                                <div key={i} className="relative group">
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="preview"
                                            className="w-12 h-12 object-cover rounded-md border border-slate-700"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-md border border-slate-700">
                                            <FileIcon size={16} className="text-slate-500" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative flex gap-2">
                        <input
                            type="file"
                            multiple
                            hidden
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-12 w-12 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-violet-400 hover:bg-violet-600/10 transition-colors"
                        >
                            <ImageIcon size={20} />
                        </Button>

                        <div className="relative flex-1">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe el síntoma o adjunta imagen..."
                                className="bg-slate-900 border-slate-700 text-white rounded-xl h-12 pl-4 pr-12 focus-visible:ring-violet-500"
                                disabled={isLoading}
                            />
                            {isLoading ? (
                                <Button
                                    type="button"
                                    onClick={() => stop()}
                                    className="absolute right-1 top-1 bottom-1 h-10 w-10 p-0 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all font-bold"
                                    title="Detener respuesta"
                                >
                                    <X size={16} />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isLoading || (!input.trim() && files.length === 0)}
                                    className="absolute right-1 top-1 bottom-1 h-10 w-10 p-0 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all font-bold"
                                >
                                    <Send size={16} />
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
