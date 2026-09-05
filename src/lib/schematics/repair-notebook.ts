import type { Role } from "@prisma/client";

export type RepairNotebookActor = { id: string; role: Role };
export type RepairNotebookRepair = { assignedUserId: string | null };
export type RepairNotebookEntryInput = {
  kind: "note" | "measurement";
  evidence: "measured" | "documented";
  assetId: string;
  pdfAssetId: string | null;
  component: string | null;
  pad: string | null;
  unit: string | null;
  value: number | null;
  note: string | null;
  page: number | null;
  documentUrl: string | null;
};

const ASSET_ID = /^[a-f0-9]{64}$/;

export function canAccessRepairNotebook(actor: RepairNotebookActor, repair: RepairNotebookRepair): boolean {
  return actor.role === "ADMIN" || (actor.role === "TECHNICIAN" && actor.id === repair.assignedUserId);
}

function optionalText(value: unknown, name: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${name} inválido`);
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`${name} admite hasta ${max} caracteres`);
  return text;
}

function optionalFiniteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("El valor debe ser finito");
    return value;
  }
  if (typeof value !== "string") throw new Error("El valor debe ser un número");
  const text = value.trim();
  if (/^[+-]?(?:Infinity|NaN)$/i.test(text)) throw new Error("El valor debe ser finito");
  if (!text || !/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) throw new Error("El valor debe ser un número decimal válido");
  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error("El valor debe ser finito");
  return parsed;
}

export function parseRepairNotebookEntry(value: unknown): RepairNotebookEntryInput {
  if (!value || typeof value !== "object") throw new Error("Datos inválidos");
  const input = value as Record<string, unknown>;
  if (input.kind !== "note" && input.kind !== "measurement") throw new Error("Tipo de registro inválido");
  if (input.evidence !== "measured" && input.evidence !== "documented") throw new Error("Origen del dato inválido");
  if (typeof input.assetId !== "string" || !ASSET_ID.test(input.assetId)) throw new Error("Activo inválido");
  const pdfAssetId = optionalText(input.pdfAssetId, "PDF", 64);
  if (pdfAssetId && !ASSET_ID.test(pdfAssetId)) throw new Error("PDF inválido");
  const page = input.page === undefined || input.page === null ? null : Number(input.page);
  if (page !== null && (!Number.isInteger(page) || page < 1 || page > 100000)) throw new Error("Página inválida");
  const documentUrl = optionalText(input.documentUrl, "Enlace", 1000);
  if (documentUrl && !documentUrl.startsWith("/technician/schematics?")) throw new Error("El enlace debe ser interno");
  if (input.evidence === "documented" && (!pdfAssetId || !page)) throw new Error("Un valor documentado requiere el PDF y la página");
  const numericValue = optionalFiniteNumber(input.value);
  const note = optionalText(input.note, "La nota", 2000);
  const unit = optionalText(input.unit, "La unidad", 30);
  if (input.kind === "measurement" && (numericValue === null || !unit)) throw new Error("La medición requiere valor y unidad");
  if (input.kind === "note" && !note) throw new Error("La nota no puede estar vacía");
  return {
    kind: input.kind, evidence: input.evidence, assetId: input.assetId, pdfAssetId,
    component: optionalText(input.component, "El componente", 120), pad: optionalText(input.pad, "El pad", 120),
    unit, value: numericValue, note, page, documentUrl,
  };
}
