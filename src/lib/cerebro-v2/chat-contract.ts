import { z } from "zod";

const textPartSchema = z.object({
    type: z.literal("text"),
    text: z.string().max(8_000),
}).passthrough();

const filePartSchema = z.object({
    type: z.literal("file"),
    mediaType: z.string().startsWith("image/"),
    url: z.string().max(6_000_000),
    filename: z.string().max(180).optional(),
}).passthrough();

const messageSchema = z.object({
    id: z.string().max(180).optional(),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(8_000).optional(),
    parts: z.array(z.union([textPartSchema, filePartSchema, z.object({ type: z.string() }).passthrough()])).max(20).optional(),
}).passthrough();

const requestSchema = z.object({
    sessionId: z.string().uuid(),
    clientMessageId: z.string().min(1).max(180),
    messages: z.array(messageSchema).min(1).max(20),
    deviceContext: z.object({
        brand: z.string().trim().min(1).max(60),
        model: z.string().trim().min(1).max(120),
    }),
}).superRefine((value, context) => {
    const fileParts = value.messages.flatMap((message) => message.parts ?? [])
        .filter((part) => part.type === "file");
    const invalidFile = fileParts.some((part) => (
        !("mediaType" in part)
        || typeof part.mediaType !== "string"
        || !part.mediaType.startsWith("image/")
    ));
    if (invalidFile) {
        context.addIssue({ code: "custom", message: "Solo se pueden adjuntar imágenes" });
    }
    const imageCount = fileParts.length;
    if (imageCount > 5) {
        context.addIssue({ code: "custom", message: "Podés adjuntar hasta 5 imágenes" });
    }
});

export type CerebroChatRequest = z.infer<typeof requestSchema>;

export type CerebroChatRequestResult =
    | { success: true; data: CerebroChatRequest }
    | { success: false; error: string };

export function parseCerebroChatRequest(input: unknown): CerebroChatRequestResult {
    const parsed = requestSchema.safeParse(input);
    if (parsed.success) return { success: true, data: parsed.data };

    const modelIssue = parsed.error.issues.some((issue) => issue.path.join(".") === "deviceContext.model");
    const brandIssue = parsed.error.issues.some((issue) => issue.path.join(".") === "deviceContext.brand");
    if (modelIssue || brandIssue) {
        return { success: false, error: "Seleccioná marca y modelo antes de consultar" };
    }
    return { success: false, error: parsed.error.issues[0]?.message ?? "Consulta técnica inválida" };
}
