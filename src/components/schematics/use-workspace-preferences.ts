"use client";
import { useCallback, useEffect, useState } from "react";
import { readWorkspaceLink, workspaceLink, type WorkspaceLocation } from "@/lib/schematics/workspace";

type Preferences = { version: 1; favorites: string[]; recent: { id: string; name: string }[]; location?: WorkspaceLocation };
const empty: Preferences = { version: 1, favorites: [], recent: [] };
export function useWorkspacePreferences(userId: string) {
  const key = `schematics:v1:${userId}`;
  const [preferences, setPreferences] = useState<Preferences>(empty);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (data && typeof data === "object" && "version" in data && data.version === 1) {
        const saved = data as Partial<Preferences>;
        setPreferences({ version: 1, favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(id => typeof id === "string" && /^[a-f0-9]{64}$/.test(id)).slice(0, 100) : [], recent: Array.isArray(saved.recent) ? saved.recent.filter(item => item && /^[a-f0-9]{64}$/.test(item.id) && typeof item.name === "string").slice(0, 12) : [], location: saved.location ? readWorkspaceLink(new URL(workspaceLink(saved.location), location.origin).searchParams) : undefined });
      }
    } catch { setWarning("El navegador no permite recuperar las preferencias guardadas."); }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify(preferences)); }
    catch { setWarning("No se pudieron guardar las preferencias en este navegador."); }
  }, [preferences, ready, key]);
  const remember = useCallback((id: string, name: string) => setPreferences(current => ({ ...current, recent: [{ id, name }, ...current.recent.filter(item => item.id !== id)].slice(0, 12) })), []);
  const toggleFavorite = useCallback((id: string) => setPreferences(current => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id].slice(-100) })), []);
  const saveLocation = useCallback((value: WorkspaceLocation) => setPreferences(current => workspaceLink(current.location ?? { page: 1 }) === workspaceLink(value) ? current : { ...current, location: value }), []);
  return { ...preferences, ready, warning, remember, toggleFavorite, saveLocation };
}
