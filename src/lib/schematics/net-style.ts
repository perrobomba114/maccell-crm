/** Classify only explicit ground names, never connectivity counts or numeric IDs. */
export function isGroundNet(name: string): boolean {
  return /^(?:GND|GROUND|AGND|DGND|PGND|SGND|VSS)(?:$|[_\s-])/i.test(name.trim());
}
export function netColor(name: string): string {
  return isGroundNet(name) ? "#c084fc" : "#22d3ee";
}
