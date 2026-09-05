import { useEffect, useRef, useState } from "react";

export function useExpandedWorkbench() {
  const root = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) setExpanded(false);
      if (event.key.toLowerCase() === 'h' && !event.ctrlKey && !event.metaKey && !(event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]'))) { event.preventDefault(); setControlsHidden(value => !value); }
    };
    const change = () => { if (document.fullscreenElement !== root.current) setExpanded(false); };
    document.addEventListener("keydown", escape); document.addEventListener('fullscreenchange', change);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); document.removeEventListener('fullscreenchange', change); };
  }, [expanded]);
  async function toggle() {
    if (expanded) {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      setExpanded(false); return;
    }
    setControlsHidden(false); setExpanded(true);
    // Embedded browsers may deny native fullscreen; the viewport layout remains usable.
    try { await root.current?.requestFullscreen?.(); } catch { /* CSS fullscreen fallback. */ }
  }
  return { root, expanded, toggle, controlsHidden, toggleControls: () => setControlsHidden(value => !value) };
}
