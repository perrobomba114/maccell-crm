import { useEffect, useLayoutEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { anchoredScroll } from '@/lib/schematics/navigation';

type Size = { width: number; height: number };
export function usePdfNavigation(container: RefObject<HTMLDivElement | null>, dimensions: Size, setZoom: Dispatch<SetStateAction<number>>) {
  const pending = useRef<{ x: number; y: number } | null>(null);
  const previous = useRef({ ...dimensions, containerWidth: 0 });
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const zoomBy = (factor: number, x?: number, y?: number) => {
    const el = container.current; if (!el) return;
    pending.current = { x: x ?? el.clientWidth / 2, y: y ?? el.clientHeight / 2 };
    setZoom(value => Math.max(.1, Math.min(12, value * factor)));
  };
  useLayoutEffect(() => {
    const el = container.current, old = previous.current;
    if (el && old.width > 0 && dimensions.width > 0 && dimensions.width !== old.width) {
      const anchor = pending.current ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 };
      el.scrollLeft = anchoredScroll(el.scrollLeft, anchor.x, dimensions.width / old.width, Math.max(12,(old.containerWidth-old.width)/2), Math.max(12,(el.clientWidth-dimensions.width)/2));
      el.scrollTop = anchoredScroll(el.scrollTop, anchor.y, dimensions.height / old.height);
    }
    previous.current = { ...dimensions, containerWidth: el?.clientWidth ?? 0 }; pending.current = null;
  }, [container, dimensions]);
  useEffect(() => {
    const el = container.current; if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.shiftKey) { el.scrollLeft += event.deltaX || event.deltaY; return; }
      const rect = el.getBoundingClientRect();
      pending.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1);
      setZoom(value => Math.max(.1, Math.min(12, value * Math.exp(-delta * .002))));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [container, setZoom]);
  return { zoomBy, handlers: {
    onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (event.button !== 0 && event.button !== 1) return;
      const el = event.currentTarget; el.focus(); suppressClick.current = false;
      drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
      if (!(event.target instanceof Element && event.target.closest('button'))) { event.preventDefault(); el.setPointerCapture(event.pointerId); }
    },
    onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      const d = drag.current; if (!d) return;
      const dx = event.clientX - d.x, dy = event.clientY - d.y;
      if (Math.hypot(dx, dy) > 4) { d.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
      if (d.moved) { event.currentTarget.scrollLeft = d.left - dx; event.currentTarget.scrollTop = d.top - dy; }
    },
    onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
      suppressClick.current = drag.current?.moved ?? false; drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel() { drag.current = null; },
    onClickCapture(event: React.MouseEvent<HTMLDivElement>) { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } },
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.target !== event.currentTarget) return;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-100,0], ArrowRight:[100,0], ArrowUp:[0,-100], ArrowDown:[0,100] };
      if (moves[event.key]) { event.preventDefault(); const [x,y]=moves[event.key]; event.currentTarget.scrollBy(x,y); }
      if (['+','=','-','0'].includes(event.key)) { event.preventDefault(); if(event.key==='0') setZoom(1); else zoomBy(event.key==='-' ? 1/1.25 : 1.25); }
    },
  }};
}
