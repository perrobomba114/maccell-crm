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
    score: number;
};
