import { parsePcbe } from "@/lib/schematics/pcbe";

self.onmessage = (event: MessageEvent<{ bytes: ArrayBuffer; name: string }>) => {
  try {
    const board = parsePcbe(new Uint8Array(event.data.bytes), event.data.name);
    if (!board.validHeader) throw new Error("El archivo no tiene una cabecera PCBE válida.");
    self.postMessage({ board });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "No se pudo interpretar la placa" });
  }
};
