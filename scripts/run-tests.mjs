import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(file));
    else if (entry.name.endsWith(".test.ts")) files.push(file);
  }
  return files.sort();
}
const files = await collect("src/__tests__");
if (!files.length) throw new Error("No se encontraron pruebas");
const child = spawn(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
child.on("error", error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
