import { getCurrentUser } from "@/actions/auth-actions";
import { readPdfPageCount } from "@/lib/schematics/ocr";
import { readCatalog, resolveAsset } from "@/lib/schematics/catalog";
import { pairIsVerified } from "@/lib/schematics/pairing";
import { resolvePairings } from "@/lib/schematics/pairing-server";
import { canAccessRepairNotebook, parseRepairNotebookEntry } from "@/lib/schematics/repair-notebook";
import { createRepairNotebookEntry, findRepairNotebookContext, listRepairConsultations, listRepairNotebookEntries } from "@/lib/schematics/repair-notebook-db";

export const dynamic = "force-dynamic";

async function authorize(repairId: string) {
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Sesión requerida" }, { status: 401 }) };
  if (user.role !== "ADMIN" && user.role !== "TECHNICIAN") return { response: Response.json({ error: "Acceso restringido" }, { status: 403 }) };
  if (!repairId || repairId.length > 100) return { response: Response.json({ error: "Reparación inválida" }, { status: 400 }) };
  const repair = await findRepairNotebookContext(repairId);
  if (!repair) return { response: Response.json({ error: "Reparación no encontrada" }, { status: 404 }) };
  if (!canAccessRepairNotebook(user, repair)) return { response: Response.json({ error: "La reparación no está asignada a este técnico" }, { status: 403 }) };
  return { user };
}

export async function GET(_request: Request, context: { params: Promise<{ repairId: string }> }) {
  try {
    const repairId = (await context.params).repairId;
    const auth = await authorize(repairId);
    if ("response" in auth) return auth.response;
    const [entries, consultations] = await Promise.all([
      listRepairNotebookEntries(repairId), listRepairConsultations(repairId),
    ]);
    return Response.json({ entries, consultations });
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo leer el cuaderno", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo leer el cuaderno" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ repairId: string }> }) {
  try {
    const repairId = (await context.params).repairId;
    const auth = await authorize(repairId);
    if ("response" in auth) return auth.response;
    let input: ReturnType<typeof parseRepairNotebookEntry>;
    try { input = parseRepairNotebookEntry(await request.json()); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Datos inválidos" }, { status: 400 }); }
    const catalog = await readCatalog();
    const asset = catalog.assets.find((item) => item.id === input.assetId && item.status === "ready");
    if (!asset) return Response.json({ error: "El archivo técnico ya no está disponible" }, { status: 400 });
    const pdf = input.pdfAssetId ? catalog.assets.find((item) => item.id === input.pdfAssetId && item.kind === "pdf" && item.status === "ready") : null;
    if (input.pdfAssetId && !pdf) {
      return Response.json({ error: "La fuente documentada debe ser un PDF disponible" }, { status: 400 });
    }
    if (input.evidence === "documented" && pdf && asset.id !== pdf.id && !pairIsVerified(asset, pdf) && !(await resolvePairings(asset, catalog.assets)).verifiedIds.includes(pdf.id)) return Response.json({ error: "La fuente documental corresponde a otro equipo" }, { status: 400 });
    if (input.evidence === "documented" && pdf) {
      const source = await resolveAsset(pdf.id);
      if (!source || !input.page || input.page > await readPdfPageCount(source.file)) return Response.json({ error: "La página fuente no existe en el PDF" }, { status: 400 });
    }
    if (input.documentUrl) {
      const link = new URL(input.documentUrl, "http://internal");
      if (link.pathname !== "/technician/schematics" || link.searchParams.get("repair") !== repairId) {
        return Response.json({ error: "El enlace no corresponde a esta reparación" }, { status: 400 });
      }
      if (input.pdfAssetId && link.searchParams.get("pdf") !== input.pdfAssetId) {
        return Response.json({ error: "El enlace no corresponde al PDF fuente" }, { status: 400 });
      }
      if (input.page && link.searchParams.get("page") !== String(input.page)) {
        return Response.json({ error: "El enlace no corresponde a la página fuente" }, { status: 400 });
      }
    }
    await createRepairNotebookEntry(repairId, auth.user.id, input);
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo guardar el cuaderno", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo guardar el registro" }, { status: 500 });
  }
}
