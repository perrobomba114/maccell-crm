import { type ScreenRow } from "@/lib/pantallas/types";

export const PANTALLAS_ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export type PantallaConnectionStatus = "online" | "offline" | "unlinked" | "paused";

export function getPantallaConnectionStatus(
  screen: Pick<ScreenRow, "activo" | "lastseen">,
  now = Date.now()
): PantallaConnectionStatus {
  if (!screen.activo) return "paused";
  if (!screen.lastseen) return "unlinked";

  const lastSeenTime = new Date(screen.lastseen).getTime();
  if (!Number.isFinite(lastSeenTime)) return "offline";

  return now - lastSeenTime <= PANTALLAS_ONLINE_THRESHOLD_MS ? "online" : "offline";
}

export function getPantallaConnectionLabel(status: PantallaConnectionStatus): string {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  if (status === "unlinked") return "Sin vincular";
  return "Pausada";
}

export function getPantallaOfflineMinutes(screen: Pick<ScreenRow, "lastseen">) {
  if (!screen.lastseen) return null;
  const diff = Date.now() - new Date(screen.lastseen).getTime();
  if (diff <= PANTALLAS_ONLINE_THRESHOLD_MS) return 0;
  return Math.floor(diff / 60000);
}
