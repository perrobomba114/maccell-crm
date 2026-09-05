"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { SchematicAsset } from "@/lib/schematics/catalog-types";

export function IdentityEditor({ asset, onUpdated, canEdit }: { asset: SchematicAsset; onUpdated(asset: SchematicAsset): void; canEdit: boolean }) {
  const [brand, setBrand] = useState(asset.brand ?? "");
  const [model, setModel] = useState(asset.model);
  const [boardCode, setBoardCode] = useState(asset.boardCode ?? "");
  const [revision, setRevision] = useState(asset.revision ?? "");
  const [aliases, setAliases] = useState((asset.aliases ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  if (!canEdit) return <div className="space-y-1 border-b p-3 text-xs">
    <strong>{asset.identityVerified ? "Identidad validada" : "Identidad sin verificar"}</strong>
    <p>{[asset.brand, asset.model, asset.boardCode, asset.revision].filter(Boolean).join(" · ")}</p>
    {!asset.identityVerified && <p className="text-muted-foreground">Un administrador puede validar la identidad de este archivo.</p>}
  </div>;
  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/schematics/${asset.id}/identity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand, model, boardCode, revision, aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean), verified: true }) });
      const result = await response.json() as { asset?: SchematicAsset; error?: string };
      if (!response.ok || !result.asset) throw new Error(result.error ?? "No se pudo verificar");
      onUpdated(result.asset); toast.success("Identidad técnica verificada");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo verificar"); }
    finally { setSaving(false); }
  }
  return <fieldset className="grid gap-2 rounded-lg border p-3"><legend className="px-1 text-xs font-bold">Verificar identidad</legend>
    {[["Marca", brand, setBrand], ["Modelo", model, setModel], ["Código de placa", boardCode, setBoardCode], ["Revisión", revision, setRevision], ["Alias separados por coma", aliases, setAliases]].map(([label, value, setter]) => <label className="grid gap-1 text-xs" key={label as string}>{label as string}<input className="h-8 rounded border bg-background px-2" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></label>)}
    <button type="button" className="rounded bg-primary px-3 py-2 text-xs font-bold text-primary-foreground" disabled={saving} onClick={() => void save()}>{saving ? "Guardando…" : "Confirmar identidad verificada"}</button>
  </fieldset>;
}
