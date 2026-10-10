/** Recognize the decoder's actual input contract, independently of extension. */
export function supportedBoardHeader(bytes: Uint8Array): boolean {
  const signature = 'XZZPCB V1.0';
  const key = bytes[0x10] ?? 0;
  return (bytes.length >= signature.length && [...signature].every((char, index) =>
    bytes[index] === char.charCodeAt(0))) || (bytes.length >= 0x44 && [...signature].every((char, index) =>
    (bytes[index] ^ key) === char.charCodeAt(0)));
}

function isDownloadCatalog(bytes: Uint8Array): boolean {
  const header = new TextDecoder().decode(bytes.subarray(0, 1024));
  return (header.startsWith('{0}') || header.startsWith('0 Learning Tutorials')) && header.includes('Xinzhizao');
}

export function inventoryFormatProblem(bytes: Uint8Array, kind: 'pdf' | 'pcbe'): string | undefined {
  const header = new TextDecoder().decode(bytes.subarray(0, 1024));
  // Some source downloads wrap the same menu in a PCBE header and XOR its
  // body with 0x20. A valid outer signature does not make it a board.
  const wrappedMenu = kind === 'pcbe' && supportedBoardHeader(bytes)
    && isDownloadCatalog(bytes.subarray(0x40, 0x440).map(value => value ^ 0x20));
  if (isDownloadCatalog(bytes) || wrappedMenu) return 'La descarga contiene el catálogo de DZKJ, no el documento solicitado. Requiere recuperar el archivo original.';
  if (kind === 'pdf') return header.includes('%PDF-') ? undefined : 'El contenido descargado no es un PDF válido. Requiere recuperar el archivo original.';
  return supportedBoardHeader(bytes) ? undefined : 'Este formato todavía no contiene geometría decodificable por el visor.';
}
