export function anchoredScroll(scroll: number, anchor: number, ratio: number, padding = 12, nextPadding = padding): number {
  return Math.max(0, (scroll + anchor - padding) * ratio + nextPadding - anchor);
}
export function pdfRasterScale(width: number, height: number, dpr: number): number {
  return Math.min(dpr, 2, Math.sqrt(24_000_000 / Math.max(1, width * height)), 16384 / Math.max(width, height, 1));
}
export function fitPageZoom(width: number, height: number, availableWidth: number, availableHeight: number, zoom: number): number {
  return Math.max(.1, Math.min(12, zoom * Math.min(availableWidth / Math.max(1, width), availableHeight / Math.max(1, height))));
}
