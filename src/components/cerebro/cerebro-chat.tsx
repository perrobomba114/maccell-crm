"use client";

import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, BrainCircuit, RefreshCw, Image as ImageIcon, X, FileIcon, Plus, Loader2, Paperclip, FileText } from "lucide-react";
import { saveMessagesToDbAction, saveUserMessageAction, updateConversationTitleAction, generateGeminiPromptAction } from "@/actions/cerebro-actions";
import { toast } from "sonner";

function renderFormattedText(text: string) {
    if (!text) return null;

    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(
            <a
                key={match.index}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all font-semibold"
            >
                {match[1]}
            </a>
        );
        lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}

interface CerebroChatProps {
    conversationId: string;
    initialMessages?: UIMessage[];
}

export function CerebroChat({ conversationId, initialMessages = [] }: CerebroChatProps) {
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [tokenUsage, setTokenUsage] = useState<{
        used: number; limit: number; remaining: number; percentage: number; resetAt: string;
    } | null>(null);

    // Polling de tokens cada 30 segundos
    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const res = await fetch('/api/cerebro/tokens');
                if (res.ok) setTokenUsage(await res.json());
            } catch { }
        };
        fetchTokens();
        const interval = setInterval(fetchTokens, 30_000);
        return () => clearInterval(interval);
    }, []);
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

            // ✅ Guardar mensaje del usuario INMEDIATAMENTE en DB
            // Si el usuario recarga antes de que el AI responda, el mensaje ya está guardado
            const isFirstMessage = !initialMessages || initialMessages.length === 0;
            saveUserMessageAction(
                conversationId,
                currentInput,
                fileParts.map(f => f.url),
                isFirstMessage  // actualizar título si es el primer mensaje
            ).catch(err => console.error('[onSubmit] Error guardando user msg:', err));

            sendMessage({
                text: currentInput,
                files: fileParts.length > 0 ? fileParts : undefined
            });
        }
    };

    const handleSummarize = async () => {
        if (messages.length === 0) return;

        setIsSummarizing(true);
        try {
            const res = await fetch("/api/cerebro/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages }),
            });

            const data = await res.json();
            if (res.ok && data.summary) {
                // Dispatch event to open KnowledgePanel with the summary
                window.dispatchEvent(new CustomEvent('cerebro-save-wiki', {
                    detail: { content: data.summary }
                }));
                toast.success("Resumen técnico generado correctamente.");
            } else {
                toast.error(data.error || "Error al generar el resumen.");
            }
        } catch (error) {
            toast.error("Error de conexión al resumir.");
        } finally {
            setIsSummarizing(false);
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

                {/* Token gauge */}
                {tokenUsage && (
                    <div className="flex flex-col items-end gap-1 min-w-[130px]">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold tabular-nums ${tokenUsage.percentage >= 80 ? 'text-red-400'
                                    : tokenUsage.percentage >= 50 ? 'text-amber-400'
                                        : 'text-emerald-400'
                                }`}>
                                {tokenUsage.remaining.toLocaleString()} restantes
                            </span>
                        </div>
                        {/* Barra de progreso */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${tokenUsage.percentage >= 80 ? 'bg-red-500'
                                        : tokenUsage.percentage >= 50 ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${tokenUsage.percentage}%` }}
                            />
                        </div>
                        <span className="text-[9px] text-slate-600 tabular-nums">
                            {tokenUsage.used.toLocaleString()}/{tokenUsage.limit.toLocaleString()} · reset en {tokenUsage.resetAt}
                        </span>
                    </div>
                )}
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
                                    {/* Mapeo de imagenes y adjuntos unicamente */}
                                    {(message.parts || []).map((part: any, index: number) => {
                                        if (part.type === 'file' || part.type === 'image') {
                                            const fileObj = part.file || part;
                                            const mediaType = fileObj.mediaType || fileObj.type || '';
                                            const isImage = part.type === 'image' || mediaType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileObj.name || fileObj.filename || '');
                                            const fileUrl = fileObj.url || (fileObj.data ? `data:${mediaType};base64,${fileObj.data}` : '') || (part.image || '');
                                            const fileName = fileObj.name || fileObj.filename || 'Imagen adjunta';

                                            return (
                                                <div key={`media-${index}`} className="mt-1">
                                                    {isImage ? (
                                                        <img
                                                            src={fileUrl}
                                                            alt={fileName}
                                                            onClick={() => {
                                                                setSelectedImage(fileUrl);
                                                                setZoom(1);
                                                            }}
                                                            className="max-w-full rounded-lg border border-slate-700 overflow-hidden shadow-md cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                                                            style={{ maxHeight: '300px' }}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700 text-xs">
                                                            <FileIcon size={14} className="text-slate-400" />
                                                            <span className="truncate">{fileName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}

                                    {/* Renderizado centralizado del Texto */}
                                    {(() => {
                                        let rawText = '';
                                        if (message.parts && message.parts.length > 0) {
                                            rawText = message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
                                        } else if (message.content) {
                                            rawText = message.content;
                                        }

                                        if (!rawText) return null;

                                        if (message.role === 'user') return <div className="whitespace-pre-wrap">{rawText}</div>;

                                        const thinkMatch = rawText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                                        const hasThink = !!thinkMatch;
                                        const thinkContent = hasThink ? thinkMatch[1].trim() : '';
                                        const mainContent = rawText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

                                        return (
                                            <>
                                                {hasThink && (
                                                    <details className="mb-3 mt-1 group" open={!rawText.includes('</think>')}>
                                                        <summary className="text-[11px] text-slate-500 font-medium cursor-pointer flex items-center gap-1.5 hover:text-slate-300 transition-colors select-none">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${rawText.includes('</think>') ? 'bg-emerald-500/50' : 'bg-violet-500/80 animate-pulse'}`} />
                                                            {rawText.includes('</think>') ? 'Análisis lógico completado' : 'Analizando hardware (DeepSeek Reasoning)...'}
                                                        </summary>
                                                        <div className="mt-2 mb-2 text-[11.5px] text-slate-400 border-l-2 border-violet-900/50 pl-3 py-1.5 bg-slate-950/30 rounded-r-md">
                                                            <div className="whitespace-pre-wrap font-mono leading-relaxed">{thinkContent}</div>
                                                        </div>
                                                    </details>
                                                )}
                                                {mainContent && (
                                                    <div className="whitespace-pre-wrap text-[14px]">
                                                        {renderFormattedText(mainContent)}
                                                    </div>
                                                )}
                                                {(message.role === 'assistant' || message.role === 'system') && mainContent && (
                                                    <div className="mt-4 flex justify-end">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                window.dispatchEvent(new CustomEvent('cerebro-save-wiki', { detail: { content: mainContent } }));
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-900/10"
                                                        >
                                                            <Plus size={12} strokeWidth={3} />
                                                            Guardar a Wiki
                                                        </button>
                                                    </div>
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0 relative">
                {/* Floating Summary Button */}
                {messages.length > 1 && (
                    <div className="absolute -top-12 left-0 right-0 flex justify-center px-4 pointer-events-none">
                        <button
                            type="button"
                            onClick={handleSummarize}
                            disabled={isSummarizing || isLoading}
                            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 border border-emerald-400/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSummarizing ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando Solución...</>
                            ) : (
                                <><BrainCircuit className="w-3.5 h-3.5" /> Finalizar y Resumir para Wiki</>
                            )}
                        </button>
                    </div>
                )}

                <form
                    onSubmit={onSubmit}
                    className="flex flex-col gap-2 w-full mx-auto"
                >
                    {/* File Previews */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
                            {files.map((file, i) => (
                                <div key={i} className="relative group shrink-0">
                                    {file.type.startsWith('image/') ? (
                                        <div className="w-16 h-16 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-800 flex flex-col items-center justify-center shadow-lg p-1 text-[10px] text-slate-400">
                                            <FileText size={20} className="mb-1 text-violet-400" />
                                            <span className="truncate w-full text-center px-1">PDF</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="absolute -top-2 -right-2 bg-red-900/60 text-red-200 hover:bg-red-600 hover:text-white backdrop-blur-sm rounded-full p-1.5 border border-red-500/30 shadow-xl transition-all z-10 opacity-100"
                                    >
                                        <X size={12} strokeWidth={3} />
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
                            accept="image/*,application/pdf"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-12 w-12 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-violet-400 hover:bg-violet-600/10 transition-colors"
                        >
                            <Paperclip size={20} />
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
                {/* Lightbox / Fullscreen Image Preview */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button
                            className="absolute top-6 right-6 p-3 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors z-[110]"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden">
                            <img
                                src={selectedImage}
                                alt="Full screen preview"
                                className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out shadow-2xl rounded-lg"
                                style={{ transform: `scale(${zoom})` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setZoom(prev => prev === 1 ? 2 : 1);
                                }}
                            />

                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-full backdrop-blur-sm transition-all shadow-xl">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(1, prev - 0.5)); }}
                                    className="text-white hover:text-violet-400 font-bold px-2 py-1"
                                >
                                    -
                                </button>
                                <span className="text-white text-xs font-mono min-w-[60px] text-center">
                                    Zoom: {(zoom * 100).toFixed(0)}%
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(4, prev + 0.5)); }}
                                    className="text-white hover:text-violet-400 font-bold px-2 py-1"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
