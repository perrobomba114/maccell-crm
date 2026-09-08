/** Recognize the decoder's actual input contract, independently of extension. */
export function supportedBoardHeader(bytes: Uint8Array): boolean {
  const signature = 'XZZPCB V1.0';
  const key = bytes[0x10] ?? 0;
  return (bytes.length >= signature.length && [...signature].every((char, index) =>
    bytes[index] === char.charCodeAt(0))) || (bytes.length >= 0x44 && [...signature].every((char, index) =>
    (bytes[index] ^ key) === char.charCodeAt(0)));
}

export function inventoryFormatProblem(bytes: Uint8Array, kind: 'pdf' | 'pcbe'): string | undefined {
  const header = new TextDecoder().decode(bytes.subarray(0, 1024));
  if ((header.startsWith('{0}') || header.startsWith('0 Learning Tutorials')) && header.includes('Xinzhizao')) return 'La descarga contiene el catálogo de DZKJ, no el documento solicitado. Requiere recuperar el archivo original.';
  if (kind === 'pdf') return header.includes('%PDF-') ? undefined : 'El contenido descargado no es un PDF válido. Requiere recuperar el archivo original.';
  return supportedBoardHeader(bytes) ? undefined : 'Este formato todavía no contiene geometría decodificable por el visor.';
}
