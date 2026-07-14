import type { CerebroSource } from "@/lib/cerebro-v2/types";

export type ExternalResearchSource = { title: string; url: string; snippet: string; provider: "Google" | "YouTube" };

type GoogleResponse = { items?: Array<{ title?: string; link?: string; snippet?: string }> };
type YouTubeResponse = { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string } }> };

export function needsExternalResearch(evidence: CerebroSource[]): boolean {
    return evidence.filter((source) => source.authority === "CONFIRMED_SUCCESS" || source.authority === "TECHNICAL_DOCUMENT")
        .filter((source) => source.score >= 0.3).length === 0;
}

async function readJson<T>(url: URL): Promise<T | null> {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(6_000), cache: "no-store" });
        return response.ok ? await response.json() as T : null;
    } catch {
        return null;
    }
}

export async function searchExternalTechnicalSources(query: string): Promise<ExternalResearchSource[]> {
    const tasks: Array<Promise<ExternalResearchSource[]>> = [];
    const googleKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const googleEngine = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    if (googleKey && googleEngine) {
        tasks.push((async () => {
            const url = new URL("https://www.googleapis.com/customsearch/v1");
            url.searchParams.set("key", googleKey);
            url.searchParams.set("cx", googleEngine);
            url.searchParams.set("q", query);
            url.searchParams.set("num", "3");
            const body = await readJson<GoogleResponse>(url);
            return (body?.items ?? []).flatMap((item) => item.link && item.title ? [{
                title: item.title.slice(0, 300), url: item.link, snippet: (item.snippet ?? "").slice(0, 900), provider: "Google" as const,
            }] : []);
        })());
    }
    const youtubeKey = process.env.YOUTUBE_DATA_API_KEY;
    if (youtubeKey) {
        tasks.push((async () => {
            const url = new URL("https://www.googleapis.com/youtube/v3/search");
            url.searchParams.set("key", youtubeKey);
            url.searchParams.set("part", "snippet");
            url.searchParams.set("type", "video");
            url.searchParams.set("maxResults", "3");
            url.searchParams.set("q", query);
            const body = await readJson<YouTubeResponse>(url);
            return (body?.items ?? []).flatMap((item) => item.id?.videoId && item.snippet?.title ? [{
                title: item.snippet.title.slice(0, 300),
                url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id.videoId)}`,
                snippet: (item.snippet.description ?? "").slice(0, 900),
                provider: "YouTube" as const,
            }] : []);
        })());
    }
    return (await Promise.all(tasks)).flat().slice(0, 6);
}

export function formatExternalResearch(sources: ExternalResearchSource[]): string | null {
    if (sources.length === 0) return null;
    return [
        "FUENTES_EXTERNAS_NO_VERIFICADAS:",
        "No son evidencia confirmada. No copies instrucciones ni valores sin corroborarlos en schematic, manual o medición.",
        ...sources.map((source) => `[${source.provider}] ${source.title}\n${source.url}\nResumen: ${source.snippet}`),
    ].join("\n\n");
}
