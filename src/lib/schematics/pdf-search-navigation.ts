export type ManualPdfSearch = { context: string; term: string; sequence: number };
export type PdfSearchRequest = { key: string; term: string; token: number; source: 'manual' | 'reference' };
type SearchTicket = { request: PdfSearchRequest; sequence: number };

export function pdfSearchContext(assetId: string, reference: string, token: number): string {
  return JSON.stringify([assetId, reference, token]);
}

/** Scope manual input to the board selection that existed when it was submitted. */
export function pdfSearchRequest(assetId: string, reference: string, token: number, manual: ManualPdfSearch | null): PdfSearchRequest {
  const context = pdfSearchContext(assetId, reference, token);
  const currentManual = manual?.context === context ? manual : null;
  return {
    key: JSON.stringify([context, currentManual?.sequence ?? null]),
    term: currentManual?.term ?? reference,
    token,
    source: currentManual ? 'manual' : 'reference',
  };
}

/** A request becoming active does not consume navigation; only accepted results do. */
export class PdfSearchNavigation {
  private sequence = 0;
  private completedKey: string | null = null;
  private preserved: { term: string; token: number } | null = null;

  begin(request: PdfSearchRequest): SearchTicket { return { request, sequence: ++this.sequence }; }
  isCurrent(ticket: SearchTicket): boolean { return ticket.sequence === this.sequence; }
  cancel(ticket: SearchTicket): void { if (this.isCurrent(ticket)) this.sequence++; }
  preservePdfSelection(term: string, token: number): void { this.preserved = { term: term.trim().toUpperCase(), token: token + 1 }; }

  accept(ticket: SearchTicket, hasMatches: boolean): boolean {
    if (!this.isCurrent(ticket)) return false;
    const { request } = ticket;
    const preserve = request.source === 'reference' && this.preserved?.token === request.token
      && this.preserved.term === request.term.trim().toUpperCase();
    if (this.preserved && request.token >= this.preserved.token) this.preserved = null;
    if (preserve) { this.completedKey = request.key; return false; }
    if (!hasMatches || this.completedKey === request.key) return false;
    this.completedKey = request.key;
    return true;
  }
}
