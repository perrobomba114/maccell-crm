"use client";
import { useState } from "react";
type Match = { assetId: string; name: string; page: number; excerpt: string; source?: "text" | "ocr" };
export function DocumentSearch({ assetId, onOpen }: { assetId?: string; onOpen(id: string, page: number): void }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <details className="sch-document-search"><summary>Buscar documentación técnica</summary><form onSubmit={async (event) => {
    event.preventDefault(); if (!assetId || busy) return; setBusy(true); setError(""); setMatches([]);
    try {
      const response = await fetch(`/api/schematics/search?asset=${assetId}&q=${encodeURIComponent(query)}`);
      const data = await response.json() as { matches?: Match[]; error?: string; status?: string; semantic?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
      setMatches(data.matches ?? []);
      if (!data.matches?.length) setError("No hay evidencia suficiente para esta consulta. Probá una referencia exacta o reconocé la página con OCR.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error de búsqueda"); }
    finally { setBusy(false); }
  }}><textarea aria-label="Consulta técnica en documentación" placeholder="Ej.: circuito de carga de batería" value={query} minLength={3} maxLength={400} onChange={(e) => setQuery(e.target.value)} /><button disabled={!assetId || busy || query.trim().length < 3}>{busy ? "Buscando…" : "Buscar en este modelo"}</button></form>{error && <p role="status">{error}</p>}{matches.map((match, index) => <button className="sch-semantic-result" key={index} onClick={() => onOpen(match.assetId, match.page)}><strong>{match.name} · pág. {match.page}{match.source === "ocr" ? " · OCR" : ""}</strong><span>{match.excerpt}</span></button>)}</details>;
}
