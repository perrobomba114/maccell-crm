export function findReferencePages(pages: { page: number; text: string }[], term: string) {
  if (term.length < 2 || term.length > 100) return [];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, "i");
  return pages.flatMap(({ page, text }) => {
    const index = text.search(pattern);
    return index < 0 ? [] : [{ page, excerpt: text.slice(Math.max(0, index - 65), index + term.length + 100) }];
  }).slice(0, 50);
}
