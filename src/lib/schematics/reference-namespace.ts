/** A PCB export with local numbering cannot be linked by matching BGA pin text. */
export function referenceNamespaceMismatch(componentNames: readonly string[], netNames: readonly string[], pdfText: string): boolean {
  const strong = (names: readonly string[]) => new Set(names.map(name=>name.toUpperCase()).filter(name=>/^(?:C|R|L|U|IC|Q|D)\d{3,5}$/.test(name)));
  const board = strong(componentNames);
  const document = strong(pdfText.match(/\b[A-Z]{1,2}\d{3,5}\b/gi) ?? []);
  if (board.size < 30 || document.size < 30 || netNames.length < 30) return false;
  const localNets = netNames.filter(name=>/^net\s*\d+$/i.test(name)).length / netNames.length;
  return localNets > 0.9 && ![...board].some(name=>document.has(name));
}
