"use server";

import { getCurrentUser } from "@/actions/auth-actions";
import {
  bulkUpdateContents,
  createContent,
  createScreen,
  deleteContent,
  deleteScreen,
  ensurePantallasSchema,
  listContents,
  listScreens,
  regenerateScreenKey,
  updateScreen,
} from "@/lib/pantallas/repository";
import { DEFAULT_DAY_CONFIG, type ContentDayConfig } from "@/lib/pantallas/types";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function getPantallasDashboardAction() {
  await requireAdmin();
  await ensurePantallasSchema();
  const screens = await listScreens();
  return screens;
}

export async function getPantallaContentsAction(screenId: string) {
  await requireAdmin();
  await ensurePantallasSchema();
  return listContents(screenId);
}

export async function createPantallaAction(input: {
  nombre: string;
  duracion: number;
  activo: boolean;
}) {
  await requireAdmin();
  await ensurePantallasSchema();

  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("El nombre es obligatorio");
  }
  if (!Number.isFinite(input.duracion) || input.duracion < 1) {
    throw new Error("La duración debe ser mayor a 0");
  }

  await createScreen({ nombre, duracion: Math.trunc(input.duracion), activo: input.activo });
  revalidatePath("/admin/pantallas");
}

export async function updatePantallaAction(input: {
  id: string;
  nombre: string;
  duracion: number;
  activo: boolean;
}) {
  await requireAdmin();
  await ensurePantallasSchema();

  await updateScreen({
    id: input.id,
    nombre: input.nombre,
    duracion: Math.trunc(input.duracion),
    activo: input.activo,
  });
  revalidatePath("/admin/pantallas");
}

export async function deletePantallaAction(id: string) {
  await requireAdmin();
  await ensurePantallasSchema();
  await deleteScreen(id);
  revalidatePath("/admin/pantallas");
}

export async function regeneratePantallaKeyAction(id: string) {
  await requireAdmin();
  await ensurePantallasSchema();
  const key = await regenerateScreenKey(id);
  revalidatePath("/admin/pantallas");
  return key;
}

export async function addPantallaContenidoAction(input: {
  screenId: string;
  titulo: string;
  archivo: string;
  peso: number;
  activo?: boolean;
  days?: Partial<ContentDayConfig>;
}) {
  await requireAdmin();
  await ensurePantallasSchema();

  if (!input.archivo.trim()) {
    throw new Error("El archivo es obligatorio");
  }

  await createContent({
    screenId: input.screenId,
    titulo: input.titulo.trim() || input.archivo.split("/").pop() || "Contenido",
    archivo: input.archivo,
    peso: input.peso,
    activo: input.activo ?? true,
    days: { ...DEFAULT_DAY_CONFIG, ...(input.days ?? {}) },
  });

  revalidatePath("/admin/pantallas");
}

export async function savePantallaContenidosAction(
  items: Array<{
    id: string;
    titulo: string;
    activo: boolean;
    orden: number;
    days: ContentDayConfig;
  }>
) {
  await requireAdmin();
  await ensurePantallasSchema();
  await bulkUpdateContents(items);
  revalidatePath("/admin/pantallas");
}

export async function deletePantallaContenidoAction(contentId: string) {
  await requireAdmin();
  await ensurePantallasSchema();
  await deleteContent(contentId);
  revalidatePath("/admin/pantallas");
}
