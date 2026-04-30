import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { uploadKnowledgeMedia } from "@/actions/upload-actions";

export interface KnowledgeItem {
    id: string;
    title: string;
    content: string;
    deviceBrand: string;
    deviceModel: string;
    problemTags: string[];
    mediaUrls?: string[];
    createdAt: string;
    author: { name: string };
}

export function useKnowledgePanel(userId?: string, initialContent?: string | null, onClearInitial?: () => void) {
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [editId, setEditId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newBrand, setNewBrand] = useState("");
    const [newModel, setNewModel] = useState("");
    const [newTags, setNewTags] = useState("");
    const [mediaFiles, setMediaFiles] = useState<{ file: File, base64: string, name: string }[]>([]);
    const [existingMedia, setExistingMedia] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchKnowledge = async (query = "") => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/cerebro/knowledge?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setItems(data);
            }
        } catch (error) {
            console.error("Error fetching knowledge:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const newMedia = await Promise.all(
                filesArray.map(async (file) => {
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    return { file, base64, name: file.name };
                })
            );
            setMediaFiles(prev => [...prev, ...newMedia]);
        }
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingMedia = (index: number) => {
        setExistingMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveWikiEntry = async () => {
        if (!newTitle || !newContent || !userId) {
            toast.error("Título y contenido son obligatorios");
            return;
        }

        setIsSaving(true);
        try {
            const uploadedUrls: string[] = [];
            for (const media of mediaFiles) {
                const res = await uploadKnowledgeMedia(media.base64, media.name);
                if (res.success && res.url) {
                    uploadedUrls.push(res.url);
                } else {
                    toast.error(`Error subiendo ${media.name}`);
                }
            }

            const finalMediaUrls = [...existingMedia, ...uploadedUrls];

            const res = await fetch("/api/cerebro/knowledge", {
                method: editId ? "PATCH" : "POST",
                body: JSON.stringify({
                    id: editId,
                    title: newTitle,
                    content: newContent,
                    deviceBrand: newBrand,
                    deviceModel: newModel,
                    problemTags: newTags.split(",").map(t => t.trim()).filter(Boolean),
                    authorId: userId,
                    mediaUrls: finalMediaUrls
                })
            });

            if (res.ok) {
                toast.success(editId ? "Solución actualizada" : "Solución guardada");
                setShowCreate(false);
                fetchKnowledge(search);
                if (editId && selectedItem) {
                    setSelectedItem({
                        ...selectedItem,
                        title: newTitle,
                        content: newContent,
                        deviceBrand: newBrand,
                        deviceModel: newModel,
                        problemTags: newTags.split(",").map(t => t.trim()).filter(Boolean),
                        mediaUrls: finalMediaUrls
                    });
                }
                resetForm();
            } else {
                toast.error("Error al guardar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setNewTitle("");
        setNewContent("");
        setNewBrand("");
        setNewModel("");
        setNewTags("");
        setMediaFiles([]);
        setExistingMedia([]);
        setEditId(null);
    };

    const startEditAction = (item: KnowledgeItem) => {
        setEditId(item.id);
        setNewTitle(item.title);
        setNewContent(item.content);
        setNewBrand(item.deviceBrand);
        setNewModel(item.deviceModel);
        setNewTags(item.problemTags.join(", "));
        setExistingMedia(item.mediaUrls || []);
        setMediaFiles([]);
        setShowCreate(true);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchKnowledge(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (initialContent) {
            setNewContent(initialContent);
            setShowCreate(true);

            try {
                let detectedTitle = "";
                let detectedBrand = "";
                let detectedModel = "";

                const titleMatch = initialContent.match(/(?:FALLA|DIAGNÓSTICO|TITULO|ASUNTO|SOLUCIÓN|RESOLUCIÓN):\s*([^\n\r*]+)/i);
                if (titleMatch && titleMatch[1]) {
                    detectedTitle = titleMatch[1].trim();
                } else {
                    const firstLine = initialContent.split('\n')[0].replace(/[*#]/g, '').trim();
                    if (firstLine.length > 5 && firstLine.length < 60) {
                        detectedTitle = firstLine;
                    }
                }

                const brandMatch = initialContent.match(/(?:MARCA|BRANDS|EQUIPO|DISPOSITIVO):\s*([^\n\r*]+)/i);
                if (brandMatch && brandMatch[1]) detectedBrand = brandMatch[1].trim();

                const modelMatch = initialContent.match(/(?:MODELO|MODEL):\s*([^\n\r*]+)/i);
                if (modelMatch && modelMatch[1]) detectedModel = modelMatch[1].trim();

                if (initialContent.toLowerCase().includes("iphone") || initialContent.toLowerCase().includes("apple") || initialContent.toLowerCase().includes("macbook")) {
                    if (!detectedBrand) detectedBrand = "Apple";
                    const iphoneMatch = initialContent.match(/(iPhone\s*[0-9]+(?:\s*Pro(?:\s*Max)?)?)/i);
                    if (iphoneMatch && iphoneMatch[1]) {
                        detectedModel = iphoneMatch[1].trim();
                        if (iphoneMatch[1].toLowerCase().includes("iphone")) detectedBrand = "Apple";
                    }
                }

                if (initialContent.toLowerCase().includes("samsung")) {
                    if (!detectedBrand) detectedBrand = "Samsung";
                    const samsungMatch = initialContent.match(/(S[0-9]{2}|A[0-9]{2}|J[0-9]|Note\s*[0-9]+)/i);
                    if (samsungMatch && samsungMatch[1]) {
                        if (!detectedModel) detectedModel = samsungMatch[1].trim();
                    }
                }

                if (detectedTitle) setNewTitle(detectedTitle);
                if (detectedBrand) setNewBrand(detectedBrand);
                if (detectedModel) setNewModel(detectedModel);
            } catch (e) {
                console.error("Error auto-parsing Wiki content:", e);
            }

            if (onClearInitial) {
                onClearInitial();
            }
        }
    }, [initialContent]);

    return {
        search, setSearch,
        items,
        isLoading,
        selectedItem, setSelectedItem,
        showCreate, setShowCreate,
        isSaving,
        newTitle, setNewTitle,
        newContent, setNewContent,
        newBrand, setNewBrand,
        newModel, setNewModel,
        newTags, setNewTags,
        mediaFiles,
        existingMedia,
        editId,
        fileInputRef,
        handleFileChange,
        removeMedia,
        removeExistingMedia,
        handleSaveWikiEntry,
        resetForm,
        startEditAction
    };
}
