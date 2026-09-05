import { getCurrentUser } from "@/actions/auth-actions";
import { modelKey } from "@/lib/schematics/catalog-types";
import { readCatalog, saveLocalCatalogIdentity } from "@/lib/schematics/catalog";
import { saveDatabaseAssetIdentity } from "@/lib/schematics/database";
import { parseVerifiedIdentity } from "@/lib/schematics/identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (user.role !== "ADMIN") return Response.json({ error: "Solo administración puede verificar identidades" }, { status: 403 });
    const id = (await context.params).id;
    const current = (await readCatalog()).assets.find((asset) => asset.id === id);
    if (!current) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    let identity: ReturnType<typeof parseVerifiedIdentity>;
    try { identity = parseVerifiedIdentity(await request.json()); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Identidad inválida" }, { status: 400 }); }
    const verifiedAt = new Date().toISOString();
    const history = [...(current.identityVerificationHistory ?? [])];
    if (current.identityVerified && current.identityVerifiedBy && current.identityVerifiedAt && current.brand && current.boardCode && current.revision) {
      history.push({ verifiedBy: current.identityVerifiedBy, verifiedAt: current.identityVerifiedAt, brand: current.brand, model: current.model, boardCode: current.boardCode, revision: current.revision, aliases: current.aliases ?? [] });
    }
    const asset = {
      ...current, ...identity, modelKey: modelKey(identity.model), identityVerified: true,
      identityVerifiedBy: user.id, identityVerifiedAt: verifiedAt, identityVerificationHistory: history.slice(-20),
    };
    const storedInDatabase = await saveDatabaseAssetIdentity(asset, current);
    if (!storedInDatabase) await saveLocalCatalogIdentity(asset, current);
    return Response.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos";
    if (message === "IDENTITY_CONFLICT") return Response.json({ error: "La identidad cambió mientras editabas. Recargá el archivo y revisá los datos." }, { status: 409 });
    console.error("[ESQUEMATICOS] No se pudo verificar la identidad", message);
    return Response.json({ error: "No se pudo guardar la identidad técnica" }, { status: 500 });
  }
}
