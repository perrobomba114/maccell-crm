import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { CerebroMessageMetadata } from "./types";
export function groundedUiResponse(
    messageId: string,
    text: string,
    metadata: CerebroMessageMetadata,
): Response {
    type ServerMessage = UIMessage<CerebroMessageMetadata>;
    const stream = createUIMessageStream<ServerMessage>({
        execute: ({ writer }) => {
            writer.write({ type: "start", messageId, messageMetadata: metadata });
            writer.write({ type: "text-start", id: "diagnosis" });
            writer.write({ type: "text-delta", id: "diagnosis", delta: text });
            writer.write({ type: "text-end", id: "diagnosis" });
            writer.write({ type: "finish", finishReason: "stop", messageMetadata: metadata });
        },
    });
    return createUIMessageStreamResponse({ stream });
}
