export const CEREBRO_SOURCE_TYPES = ["REPAIR", "WIKI", "PDF", "CHAT_ATTACHMENT"] as const;

export type CerebroSourceType = (typeof CEREBRO_SOURCE_TYPES)[number];

export const CEREBRO_AUTHORITIES = [
    "CONFIRMED_SUCCESS",
    "TECHNICAL_DOCUMENT",
    "INCOMPLETE",
    "FAILED",
    "UNVERIFIED_ATTACHMENT",
] as const;

export type CerebroAuthority = (typeof CEREBRO_AUTHORITIES)[number];

export type CerebroSource = {
    chunkId: string;
    documentId: string;
    sourceType: CerebroSourceType;
    authority: CerebroAuthority;
    brand: string;
    model: string;
    title: string;
    pageNumber: number | null;
    content: string;
    score: number;
};

export type CerebroPublicSource = {
    documentId: string;
    sourceType: Extract<CerebroSourceType, "REPAIR" | "PDF">;
    authority: CerebroAuthority;
    brand: string;
    model: string;
    title: string;
    pageNumber: number | null;
    excerpt: string;
};

export type GuidedObservation = {
    kind: "current" | "voltage" | "resistance" | "visual" | "behavior";
    value?: string;
    unit?: string;
    conditions: string;
};

export type GuidedOption = {
    id: string;
    label: string;
    observation: GuidedObservation;
};

export type GuidedQuestion = {
    id: string;
    prompt: string;
    measurement: string;
    conditions: string;
    options: GuidedOption[];
    sourceDocumentIds: string[];
    allowFreeText: true;
};

export type GuidedAnswer = {
    questionId: string;
    optionId: string;
};

export type CerebroStoredMessageMetadata = {
    guidedQuestion?: GuidedQuestion;
    guidedAnswer?: GuidedAnswer & { observation?: GuidedObservation };
};

export type CerebroMessageMetadata = {
    promptVersion: string;
    provider: string;
    sources: CerebroPublicSource[];
    guidedQuestion?: GuidedQuestion;
};
