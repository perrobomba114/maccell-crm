export type BuildCerebroRequestInput = {
    sessionId: string;
    clientMessageId: string;
    messages: readonly unknown[];
};

export function buildCerebroRequestBody(input: BuildCerebroRequestInput) {
    return {
        sessionId: input.sessionId,
        clientMessageId: input.clientMessageId,
        messages: input.messages,
    };
}

export async function readCerebroApiError(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { error?: unknown };
        return typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : `Cerebro respondió con error ${response.status}`;
    } catch {
        return `Cerebro respondió con error ${response.status}`;
    }
}
