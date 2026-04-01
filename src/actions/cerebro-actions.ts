"use server";

import { db } from "@/lib/db";
const prisma = db as any;
import { revalidatePath } from "next/cache";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import { getCurrentUser } from "@/actions/auth-actions";

export async function getConversationsAction(userId: string) {
    const caller = await getCurrentUser();
    if (!caller || caller.id !== userId) return { success: false, error: "No autorizado" };
    try {
        const conversations = await prisma.cerebroConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            take: 50,
        });
        console.log(`[CEREBRO_GET] Fetched ${conversations.length} conversations for user ${userId}`);
        return { success: true, data: conversations };
    } catch (error: any) {
        console.error("[getConversationsAction] Error:", error);
        return { success: false, error: "Error al obtener conversaciones." };
    }
}

export async function getConversationMessagesAction(conversationId: string, userId: string) {
    const caller = await getCurrentUser();
    if (!caller || caller.id !== userId) return { success: false, error: "No autorizado" };
    try {
        // Verificar que la conversación le pertenezca
        const conv = await prisma.cerebroConversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!conv || conv.userId !== userId) {
            return { success: false, error: "Conversación no encontrada o sin acceso." };
        }

        return { success: true, data: conv.messages };
    } catch (error: any) {
        console.error("[getConversationMessagesAction] Error:", error);
        return { success: false, error: "Error al obtener mensajes." };
    }
}

export async function createConversationAction(userId: string, title: string = "Nueva Conversación") {
    const caller = await getCurrentUser();
    if (!caller || caller.id !== userId) return { success: false, error: "No autorizado" };
    try {
        const conversation = await prisma.cerebroConversation.create({
            data: {
                userId,
                title,
            },
        });
        revalidatePath("/admin/cerebro");
        revalidatePath("/technician/cerebro");
        return { success: true, data: conversation };
    } catch (error: any) {
        console.error("[createConversationAction] Error:", error);
        return { success: false, error: error.message || "Error al crear la conversación." };
    }
}

/**
 * Guarda el mensaje del usuario INMEDIATAMENTE al enviarlo.
 * No espera a onFinish — evita pérdida de mensajes si el usuario recarga.
 */
export async function saveUserMessageAction(
    conversationId: string,
    content: string,
    mediaUrls: string[] = [],
    updateTitle = false
) {
    try {
        // Verificar cuántos mensajes existen ya para esta conversación
        const existingCount = await prisma.cerebroMessage.count({
            where: { conversationId }
        });

        await prisma.cerebroMessage.create({
            data: {
                conversationId,
                role: 'user',
                content: content || '',
                mediaUrls
            }
        });

        // Si es el primer mensaje → actualizar título de la conversación
        if (existingCount === 0 && content && updateTitle) {
            const cleanTitle = content.substring(0, 50).trim() + (content.length > 50 ? '...' : '');
            await prisma.cerebroConversation.update({
                where: { id: conversationId },
                data: { title: cleanTitle }
            });
        }

        console.log(`[CEREBRO_USER_MSG] Guardado inmediato en conv: ${conversationId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[saveUserMessageAction] Error:', error);
        return { success: false };
    }
}

export async function saveMessagesToDbAction(conversationId: string, messages: { role: string; content: string; mediaUrls?: string[] }[]) {
    try {
        console.log(`[CEREBRO_SAVE] Sincronizando ${messages.length} mensajes para conv: ${conversationId}`);
        // Obtenemos los mensajes actuales en DB:
        const existingMessages = await prisma.cerebroMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: "asc" }
        });

        // Solo guardar los nuevos
        const newMessages = messages.slice(existingMessages.length);

        if (newMessages.length > 0) {
            for (const m of newMessages) {
                await prisma.cerebroMessage.create({
                    data: {
                        conversationId,
                        role: m.role,
                        content: m.content || "",
                        mediaUrls: m.mediaUrls || []
                    }
                });
            }
        }
        return { success: true };
    } catch (error: any) {
        console.error("[saveMessagesToDbAction] Error:", error);
        return { success: false, error: "Error guardando mensajes en DB." };
    }
}

export async function deleteConversationAction(conversationId: string) {
    console.log("[CEREBRO_DELETE] Iniciando eliminación de conversación:", conversationId);
    const caller = await getCurrentUser();
    if (!caller) return { success: false, error: "No autorizado" };
    try {
        // Verify ownership before deleting
        const conv = await prisma.cerebroConversation.findUnique({ where: { id: conversationId }, select: { userId: true } });
        if (!conv || (conv.userId !== caller.id && caller.role !== "ADMIN")) {
            return { success: false, error: "No autorizado" };
        }
        // Borramos primero los mensajes y luego la conversación
        // Usamos deleteMany porque es más laxo que delete si el registro ya no existe o hay delays
        await prisma.cerebroMessage.deleteMany({
            where: { conversationId }
        });

        const deleted = await prisma.cerebroConversation.deleteMany({
            where: { id: conversationId },
        });

        console.log(`[CEREBRO_DELETE] Resultado: ${deleted.count} conversaciones eliminadas.`);

        // Invalida de forma masiva para forzar refresco total
        revalidatePath("/admin/cerebro", "layout");
        revalidatePath("/technician/cerebro", "layout");
        revalidatePath("/", "layout");

        return { success: true };
    } catch (error: any) {
        console.error("[CEREBRO_DELETE] ERROR EN DB:", error);
        return { success: false, error: "Error en la base de datos al intentar eliminar." };
    }
}

export async function updateConversationTitleAction(conversationId: string, title: string) {
    try {
        await prisma.cerebroConversation.update({
            where: { id: conversationId },
            data: { title: title.substring(0, 50) }
        });
        revalidatePath("/admin/cerebro");
        revalidatePath("/technician/cerebro");
        return { success: true };
    } catch (error: any) {
        console.error("[updateConversationTitleAction] Error:", error);
        return { success: false, error: "Error al actualizar el título." };
    }
}

export async function generateGeminiPromptAction(query: string) {
    try {
        console.log(`[GEMINI_PROMPT_GEN] Buscando contexto para query: ${query.substring(0, 50)}...`);
        let ragContext = '';
        if (query.length > 5) {
            const similarRepairs = await findSimilarRepairs(query, 3, 0.72);
            ragContext = formatRAGContext(similarRepairs);
            if (ragContext) {
                console.log(`[GEMINI_PROMPT_GEN] ${similarRepairs.length} casos inyectados.`);
            }
        }

        const SYSTEM_PROMPT = `Eres "Cerebro", el sistema operativo de inteligencia técnica de MACCELL. Eres una IA avanzada especializada en microsoldadura electrónica y reparaciones de hardware y software (iOS y Android).
Reglas y comportamiento estricto:
1. No iterés en explicaciones básicas; ve directamente al diagnóstico físico, mediciones en placa o protocolos de arranque.
2. ESTRUCTURA TU RESPUESTA ASÍ:
   - 📂 REFERENCIA HISTÓRICA: Analiza si la siguiente base de conocimientos resuelve o ayuda a este caso.
   - 🔍 PROTOCOLO TÉCNICO: Explica tu línea de razonamiento y cómo arrancar el diagnóstico.
   - 🛠️ MEDICIONES: En caso de requerir multímetro o fuente, detalla componentes (Líneas, Escala de Diodo / mV).
   - 🎯 DIAGNÓSTICO SUGERIDO: Qué IC o componente reparar/reemplazar o qué reballing aplicar.

A continuación, información histórica extraída de la base de datos local de averías previas de MACCELL:
${ragContext ? ragContext : "No se encontró historial previo para esta falla. Analiza desde cero."}

INSTRUCCIÓN DEL TÉCNICO LOCAL:
${query}
`;

        return { success: true, prompt: SYSTEM_PROMPT };
    } catch (error: any) {
        console.error("[generateGeminiPromptAction] Error:", error);
        return { success: false, error: "Error al compilar el contexto." };
    }
}
