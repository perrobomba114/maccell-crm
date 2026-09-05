/** Only local workbench references authored by the retrieval layer are navigable. */
export function safeWorkbenchUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.startsWith('/technician/schematics?')) return undefined;
    try {
        const url = new URL(value, 'https://maccell.invalid');
        if (url.origin !== 'https://maccell.invalid' || url.pathname !== '/technician/schematics' || url.hash) return undefined;
        const allowed = new Set(['board', 'pdf', 'page', 'component', 'net']);
        if ([...url.searchParams].some(([key, item]) => !allowed.has(key) || !item || item.length > 200)) return undefined;
        const keys = [...url.searchParams.keys()];
        if (new Set(keys).size !== keys.length) return undefined;
        for (const key of ['board', 'pdf']) {
            const id = url.searchParams.get(key);
            if (id !== null && !/^[a-f0-9]{64}$/.test(id)) return undefined;
        }
        if (!url.searchParams.has('board') && !url.searchParams.has('pdf')) return undefined;
        if (url.searchParams.has('page') && (!/^[1-9]\d*$/.test(url.searchParams.get('page')!) || !Number.isSafeInteger(Number(url.searchParams.get('page'))))) return undefined;
        return `${url.pathname}${url.search}`;
    } catch { return undefined; }
}
