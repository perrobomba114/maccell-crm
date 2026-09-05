"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";
import type { RepairNotebookConsultation, RepairNotebookEntry } from "@/lib/schematics/repair-notebook-db";
import { RepairConsultationList } from "./repair-consultation-list";
import { RepairNotebookEntryList } from "./repair-notebook-entry-list";

export type RepairNotebookProps = {
  repairId: string;
  asset: SchematicAsset | null;
  component?: string | null;
  pad?: string | null;
  pdfAssetId?: string | null;
  page?: number | null;
  documentUrl?: string | null;
};

type RepairContext = { id: string; ticketNumber: string; deviceBrand: string; deviceModel: string };

export function RepairNotebook({ repairId, asset, component, pad, pdfAssetId, page, documentUrl }: RepairNotebookProps) {
  const [repair, setRepair] = useState<RepairContext | null>(null);
  const [entries, setEntries] = useState<RepairNotebookEntry[]>([]);
  const [consultations, setConsultations] = useState<RepairNotebookConsultation[]>([]);
  const [kind, setKind] = useState<"note" | "measurement">("measurement");
  const [evidence, setEvidence] = useState<"measured" | "documented">("measured");
  const [componentValue, setComponentValue] = useState(component ?? "");
  const [padValue, setPadValue] = useState(pad ?? "");
  const [unit, setUnit] = useState("V");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [consultationError, setConsultationError] = useState("");
  const consulted = useRef(new Set<string>());

  async function reload() {
    const [contextResponse, entriesResponse] = await Promise.all([
      fetch(`/api/schematics/repairs/${encodeURIComponent(repairId)}`),
      fetch(`/api/schematics/repairs/${encodeURIComponent(repairId)}/entries`),
    ]);
    if (!contextResponse.ok || !entriesResponse.ok) throw new Error("No se pudo abrir el cuaderno de esta reparación");
    const contextData = await contextResponse.json() as { repair: RepairContext };
    const entriesData = await entriesResponse.json() as { entries: RepairNotebookEntry[]; consultations: RepairNotebookConsultation[] };
    setRepair(contextData.repair); setEntries(entriesData.entries); setConsultations(entriesData.consultations);
  }

  useEffect(() => {
    setLoading(true); setLoadError("");
    void reload().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "No se pudo abrir el cuaderno";
      setLoadError(message); toast.error(message);
    }).finally(() => setLoading(false));
  }, [repairId]);

  useEffect(() => { setComponentValue(component ?? ""); }, [component]);
  useEffect(() => { setPadValue(pad ?? ""); }, [pad]);
  useEffect(() => {
    const assetIds = [...new Set([asset?.id, pdfAssetId].filter((id): id is string => Boolean(id)))];
    const pending = assetIds.filter((assetId) => !consulted.current.has(`${repairId}:${assetId}`));
    if (!pending.length) return;
    pending.forEach((assetId) => consulted.current.add(`${repairId}:${assetId}`));
    setConsultationError("");
    const requests = pending.map(async (assetId) => {
      const response = await fetch(`/api/schematics/repairs/${encodeURIComponent(repairId)}/consultations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId }),
      });
      if (response.ok) return;
      consulted.current.delete(`${repairId}:${assetId}`);
      const result = await response.json() as { error?: string };
      throw new Error(result.error ?? "No se pudo registrar el archivo consultado");
    });
    void Promise.allSettled(requests).then(async (results) => {
      if (results.some((result) => result.status === "fulfilled")) await reload();
      const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failure) throw failure.reason;
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "No se pudo registrar el archivo consultado";
      setConsultationError(message); toast.error(message);
    });
  }, [asset, pdfAssetId, repairId]);

  async function save() {
    if (!asset) return toast.error("Abrí una placa o documento antes de registrar datos");
    setSaving(true);
    try {
      const sourceLink = documentUrl ? new URL(documentUrl, window.location.origin) : null;
      if (sourceLink) {
        if (componentValue.trim()) sourceLink.searchParams.set("component", componentValue.trim());
        else sourceLink.searchParams.delete("component");
        if (componentValue !== component) sourceLink.searchParams.delete("net");
      }
      const response = await fetch(`/api/schematics/repairs/${encodeURIComponent(repairId)}/entries`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, evidence, assetId: asset.id, pdfAssetId, component: componentValue, pad: padValue, unit, value, note, page: pdfAssetId ? page : null, documentUrl: sourceLink ? `${sourceLink.pathname}${sourceLink.search}` : null }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar");
      setValue(""); setNote(""); await reload(); toast.success("Registro guardado en la reparación");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); }
    finally { setSaving(false); }
  }

  return <section className="flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-3" aria-label="Cuaderno de reparación">
    <header className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 text-cyan-500" /><div><h2 className="text-sm font-black">Cuaderno de reparación</h2><p className="text-[11px] text-muted-foreground">{repair ? `#${repair.ticketNumber} · ${repair.deviceBrand} ${repair.deviceModel}` : "Cargando reparación…"}</p></div></header>
    {loading ? <div className="flex items-center justify-center p-5"><Loader2 className="h-5 w-5 animate-spin" /></div> : loadError ? <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">{loadError}</div> : <>
      {consultationError ? <p role="alert" className="text-xs text-amber-600">{consultationError}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Tipo de registro" className="h-9 rounded-md border bg-background px-2 text-xs" value={kind} onChange={(event) => setKind(event.target.value as "note" | "measurement")}><option value="measurement">Medición</option><option value="note">Nota</option></select>
        <select aria-label="Origen del valor" className="h-9 rounded-md border bg-background px-2 text-xs" value={evidence} onChange={(event) => setEvidence(event.target.value as "measured" | "documented")}><option value="measured">Medido en placa</option><option value="documented">Valor documentado</option></select>
        <input aria-label="Componente" className="h-9 rounded-md border bg-background px-2 text-xs" placeholder="Componente (U4000)" value={componentValue} onChange={(event) => setComponentValue(event.target.value)} />
        <input aria-label="Pad" className="h-9 rounded-md border bg-background px-2 text-xs" placeholder="Pad (A1)" value={padValue} onChange={(event) => setPadValue(event.target.value)} />
        {kind === "measurement" ? <><input aria-label="Valor medido" className="h-9 rounded-md border bg-background px-2 text-xs" inputMode="decimal" placeholder="Valor" value={value} onChange={(event) => setValue(event.target.value)} /><input aria-label="Unidad de medida" className="h-9 rounded-md border bg-background px-2 text-xs" placeholder="Unidad" value={unit} onChange={(event) => setUnit(event.target.value)} /></> : null}
      </div>
      <textarea aria-label="Nota técnica" className="min-h-20 resize-y rounded-md border bg-background p-2 text-xs" maxLength={2000} placeholder={kind === "note" ? "Nota técnica…" : "Condición de la medición (opcional)…"} value={note} onChange={(event) => setNote(event.target.value)} />
      {evidence === "documented" && (!pdfAssetId || !page) ? <p className="text-xs font-medium text-amber-600">Abrí el PDF en la página fuente antes de guardar un valor documentado.</p> : null}
      <Button size="sm" disabled={saving || !asset || (evidence === "documented" && (!pdfAssetId || !page))} onClick={() => void save()}>{saving ? <Loader2 className="animate-spin" /> : <Plus />} Guardar registro</Button>
      <RepairConsultationList repairId={repairId} consultations={consultations} />
      <div className="max-h-80 overflow-y-auto pr-1"><RepairNotebookEntryList entries={entries} /></div>
    </>}
  </section>;
}
