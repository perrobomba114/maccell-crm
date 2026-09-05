import { readFile, mkdir, mkdtemp, writeFile, unlink, rmdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";

async function main() {
  const root = await realpath(process.argv[2] ?? "upload/schematics");
  const output = path.resolve(process.argv[3] ?? "output/schematics/maccell-schematics.tar.gz");
  const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
  const files = ["catalog.json"];
  for (const asset of catalog.assets) {
    const file = await realpath(path.join(root, asset.relativePath));
    if (!file.startsWith(root + path.sep)) throw new Error("Un archivo escapa a la biblioteca");
    const bytes = await readFile(file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== asset.sha256 || bytes.length !== asset.size) throw new Error(`Integridad incorrecta: ${asset.relativePath}`);
    files.push(asset.relativePath);
    if (asset.kind === "pdf" && asset.status === "ready") {
      const index = `.index/${asset.id}.json`;
      JSON.parse(await readFile(path.join(root, index), "utf8"));
      files.push(index);
    }
  }
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = await mkdtemp(path.join(tmpdir(), "maccell-schematics-"));
  const list = path.join(temporary, "files.txt");
  try {
    await writeFile(list, [...new Set(files)].join("\0") + "\0");
    await new Promise((resolve, reject) => {
      const child = spawn("tar", ["-czf", output, "-C", root, "--null", "-T", list], { stdio: "inherit" });
      child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`tar finalizó con ${code}`)));
    });
    process.stdout.write(JSON.stringify({ output, assets: catalog.assets.length, archiveEntries: new Set(files).size }) + "\n");
  } finally { await unlink(list); await rmdir(temporary); }
}
main().catch((error) => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
