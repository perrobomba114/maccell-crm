import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { RepairNotebookEntryInput } from "./repair-notebook";

export type RepairNotebookContext = { id: string; ticketNumber: string; deviceBrand: string; deviceModel: string; assignedUserId: string | null };
export type RepairNotebookEntry = RepairNotebookEntryInput & { id: string; author: { id: string; name: string }; createdAt: string };
export type RepairNotebookConsultation = {
  id: string; assetId: string; assetName: string; assetKind: "pcbe" | "pdf";
  author: { id: string; name: string }; createdAt: string;
};

export async function findRepairNotebookContext(repairId: string): Promise<RepairNotebookContext | null> {
  const rows = await db.$queryRaw<RepairNotebookContext[]>`
    SELECT id, "ticketNumber", "deviceBrand", "deviceModel", "assignedUserId"
    FROM repairs WHERE id = ${repairId} LIMIT 1`;
  return rows[0] ?? null;
}

export async function recordRepairConsultation(repairId: string, assetId: string, authorId: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO schematics.repair_consultations (id, repair_id, asset_id, author_id)
    VALUES (${randomUUID()}, ${repairId}, ${assetId}, ${authorId})
    ON CONFLICT (repair_id, asset_id, author_id) DO UPDATE SET created_at = now()`;
}

export async function createRepairNotebookEntry(repairId: string, authorId: string, input: RepairNotebookEntryInput): Promise<void> {
  await db.$executeRaw`
    INSERT INTO schematics.repair_entries
      (id, repair_id, asset_id, pdf_asset_id, component, pad, kind, evidence, unit, value, note, page_number, document_url, author_id)
    VALUES (${randomUUID()}, ${repairId}, ${input.assetId}, ${input.pdfAssetId}, ${input.component}, ${input.pad},
      ${input.kind}, ${input.evidence}, ${input.unit}, ${input.value}, ${input.note}, ${input.page}, ${input.documentUrl}, ${authorId})`;
}

type EntryRow = Omit<RepairNotebookEntry, "author" | "createdAt"> & { author_id: string; author_name: string; created_at: Date };
export async function listRepairNotebookEntries(repairId: string): Promise<RepairNotebookEntry[]> {
  const rows = await db.$queryRaw<EntryRow[]>`
    SELECT e.id, e.kind, e.evidence, e.asset_id AS "assetId", e.pdf_asset_id AS "pdfAssetId",
      e.component, e.pad, e.unit, e.value::float8 AS value, e.note, e.page_number AS page,
      e.document_url AS "documentUrl", e.author_id, u.name AS author_name, e.created_at
    FROM schematics.repair_entries e JOIN users u ON u.id = e.author_id
    WHERE e.repair_id = ${repairId} ORDER BY e.created_at DESC, e.id DESC LIMIT 250`;
  return rows.map(({ author_id, author_name, created_at, ...entry }) => ({
    ...entry, author: { id: author_id, name: author_name }, createdAt: created_at.toISOString(),
  }));
}

type ConsultationRow = { id: string; asset_id: string; asset_name: string; asset_kind: "pcbe" | "pdf"; author_id: string; author_name: string; created_at: Date };
export async function listRepairConsultations(repairId: string): Promise<RepairNotebookConsultation[]> {
  const rows = await db.$queryRaw<ConsultationRow[]>`
    SELECT c.id, c.asset_id, a.metadata->>'name' AS asset_name, a.kind AS asset_kind,
      c.author_id, u.name AS author_name, c.created_at
    FROM schematics.repair_consultations c
    JOIN schematics.assets a ON a.id = c.asset_id JOIN users u ON u.id = c.author_id
    WHERE c.repair_id = ${repairId} ORDER BY c.created_at DESC, c.id DESC LIMIT 100`;
  return rows.map((row) => ({
    id: row.id, assetId: row.asset_id, assetName: row.asset_name, assetKind: row.asset_kind,
    author: { id: row.author_id, name: row.author_name }, createdAt: row.created_at.toISOString(),
  }));
}
