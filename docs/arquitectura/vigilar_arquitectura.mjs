#!/usr/bin/env node
/**
 * Watcher de desarrollo: regenera el mapa 2 segundos después del último cambio guardado.
 * Uso: npm run arq:watch
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..", "..");
const GENERADOR = path.join(AQUI, "actualizar_arquitectura.mjs");
const IGNORAR = /(^|[\\/])(node_modules|\.git|\.next[^\\/]*|upload|backups|output|outputs|coverage|\.playwright[^\\/]*|\.worktrees|arquitectura)([\\/]|$)/;
const ESPERA_MS = 2000;

let temporizador = null;
let corriendo = false;
let pendiente = false;

function regenerar() {
  if (corriendo) {
    pendiente = true;
    return;
  }
  corriendo = true;
  execFile(process.execPath, [GENERADOR], { cwd: RAIZ }, (error, salida, errores) => {
    process.stdout.write(`[arq ${new Date().toLocaleTimeString("es-AR")}] ${salida.trim().split("\n")[0] ?? ""}\n`);
    if (error) process.stderr.write(errores);
    corriendo = false;
    if (pendiente) {
      pendiente = false;
      regenerar();
    }
  });
}

fs.watch(RAIZ, { recursive: true }, (_evento, archivo) => {
  if (!archivo || IGNORAR.test(archivo) || !/\.(ts|tsx|js|mjs|cjs|py|sql|prisma|sh|json)$/.test(archivo)) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(regenerar, ESPERA_MS);
});

process.stdout.write("[arq] Vigilando cambios (debounce 2 s). Ctrl+C para salir.\n");
