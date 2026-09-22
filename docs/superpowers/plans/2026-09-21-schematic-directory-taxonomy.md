# Taxonomía publicada del árbol de esquemáticos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar un árbol fiable para móviles y consolas, derivado de activos físicos válidos y sin modelos, familias ni duplicados inventados.

**Architecture:** Separar reconciliación de activos y taxonomía de presentación. `catalog.ts` entrega activos reconciliados contra el root activo; `tree.ts` transforma sólo activos con identidad de navegación comprobable. La UI conserva sus contratos por `asset.id`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Node test runner existente y Tailwind/shadcn.

**Spec:** `docs/superpowers/specs/2026-09-21-schematic-directory-taxonomy-design.md`

## Global Constraints

- No mover, borrar ni renombrar archivos de `/mnt/data2`.
- No crear nodos `Tablets`, `Computadoras`, `Notebook` ni `Por clasificar`.
- Deduplicar sólo en la vista por SHA-256; hashes distintos siguen siendo activos distintos.
- Una consola sólo puede entrar desde `pcbe/Consolas/<familia>/` o `pdf/Consolas/<familia>/`.
- Conservar búsqueda, pairing PDF-PCBE y apertura por `asset.id`.
- No inferir ni escribir identidades mediante IA en esta entrega.

## Review Focus

- Una variante Qualcomm/Intel o un código de placa legítimo no debe fusionarse.
- Una mención de PS3 o Switch fuera de una ruta canónica no debe crear una consola.
- El duplicado SHA de ruta histórica y canónica debe conservar el canónico.
- Técnicos no deben ver rutas absolutas ni pendientes como carpetas.

---

### Task 1: Reconciliar activos publicados

**Files:**
- Create: `src/lib/schematics/published-assets.ts`
- Modify: `src/lib/schematics/catalog.ts:18-47`
- Test: `src/__tests__/schematics/published-assets.test.ts`

**Interfaces:**
- Consumes: `SchematicAsset[]` y los paths relativos existentes del root activo.
- Produces: `reconcilePublishedAssets(assets, existingPaths): SchematicAsset[]` e `isCanonicalConsolePath(relativePath): boolean`.

- [ ] **Step 1: Write the failing reconciliation tests**

```ts
test("prefers canonical console paths for equal hashes", () => {
  const result = reconcilePublishedAssets([
    asset({ id: "old", sha256: "a".repeat(64), relativePath: "Consolas/PlayStation/guide.pdf" }),
    asset({ id: "new", sha256: "a".repeat(64), relativePath: "pdf/Consolas/PlayStation/PS5/guide.pdf" }),
  ], new Set(["Consolas/PlayStation/guide.pdf", "pdf/Consolas/PlayStation/PS5/guide.pdf"]));
  assert.deepEqual(result.map(item => item.id), ["new"]);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npx tsx --test src/__tests__/schematics/published-assets.test.ts`

Expected: failure because the reconciliation module does not exist.

- [ ] **Step 3: Implement the pure reconciler**

```ts
export function isCanonicalConsolePath(relativePath: string): boolean {
  return /^(?:pcbe|pdf)\/Consolas\/(?:Nintendo|PlayStation|SteamDeck|Xbox)\//i.test(normalize(relativePath));
}

export function reconcilePublishedAssets(assets: readonly SchematicAsset[], existingPaths: ReadonlySet<string>): SchematicAsset[] {
  const best = new Map<string, SchematicAsset>();
  for (const asset of assets) {
    if (asset.status !== "ready" || !existingPaths.has(normalize(asset.relativePath))) continue;
    const previous = best.get(asset.sha256);
    if (!previous || presentationPriority(asset) < presentationPriority(previous)) best.set(asset.sha256, asset);
  }
  return [...best.values()];
}
```

`catalog.ts` obtiene el conjunto de paths una vez durante la carga. El desempate usa ruta normalizada y no muta inputs.

- [ ] **Step 4: Run focused tests**

Run: `npx tsx --test src/__tests__/schematics/published-assets.test.ts src/__tests__/schematics/catalog-merge.test.ts src/__tests__/schematics/library.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/schematics/published-assets.ts src/lib/schematics/catalog.ts src/__tests__/schematics/published-assets.test.ts && git commit -m "fix(schematics): reconcile published catalog assets"`

### Task 2: Construir una identidad de navegación conservadora

**Files:**
- Create: `src/lib/schematics/tree-identity.ts`
- Modify: `src/lib/schematics/tree.ts:1-150`
- Test: `src/__tests__/schematics/directory-tree.test.ts`

**Interfaces:**
- Consumes: `SchematicAsset`, `documentRole()` e `isCanonicalConsolePath()`.
- Produces: `publishedTreeIdentity(asset): TreeIdentity | null`; `null` retiene el activo fuera del árbol, sin carpeta residual.

- [ ] **Step 1: Write failing taxonomy tests**

```ts
test("rejects file and role labels as Apple models", () => {
  const tree = buildDirectoryTree([
    mockAsset("a", "pdf/iPhone(VIP)/A10 pcb layer.pdf", "A10 pcb layer.pdf", "pdf"),
    mockAsset("b", "pdf/iPhone(VIP)/General/file.pdf", "file.pdf", "pdf"),
  ]);
  assert.equal(tree.find(node => node.name === "Apple")?.totalFiles ?? 0, 0);
});

test("creates PlayStation only from canonical paths", () => {
  const tree = buildDirectoryTree([
    mockAsset("ps5", "pcbe/Consolas/PlayStation/PS5/board.pcbe", "board.pcbe"),
    mockAsset("noise", "pdf/SONY/DA0PS3MB6D0/manual.pdf", "manual.pdf", "pdf"),
  ]);
  assert.equal(tree.find(node => node.name === "Consolas")?.subfolders.get("PlayStation")?.totalFiles, 1);
});
```

- [ ] **Step 2: Run the tree test to verify failure**

Run: `npx tsx --test src/__tests__/schematics/directory-tree.test.ts`

Expected: failure under the existing fallback model logic.

- [ ] **Step 3: Extract rules and simplify tree construction**

```ts
export function isNoiseModel(value: string): boolean {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  return !normalized || /\.(?:pdf|pcbe|pcb)$/i.test(normalized)
    || /\b(?:pcb layer|schematic|diagram|layout|manual|notes|faq|trouble shooting|schematic and silk|general)\b/i.test(normalized);
}

export function publishedTreeIdentity(asset: SchematicAsset): TreeIdentity | null {
  return consoleIdentityFromCanonicalPath(asset.relativePath) ?? mobileIdentityFromDeclaredMetadataOrPath(asset);
}
```

Use `Consolas/<family>/<model>/<role>` for consoles and `<manufacturer>/<model>/<role>` for mobiles. Reject technical folders/extensions; preserve technically evidenced Qualcomm/Intel, board-code and revision suffixes.

- [ ] **Step 4: Run compatibility tests**

Run: `npx tsx --test src/__tests__/schematics/directory-tree.test.ts src/__tests__/schematics/catalog-search.test.ts src/__tests__/schematics/paired-search.test.ts src/__tests__/schematics/linked-navigation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/schematics/tree-identity.ts src/lib/schematics/tree.ts src/__tests__/schematics/directory-tree.test.ts && git commit -m "fix(schematics): publish evidence based directory taxonomy"`

### Task 3: Publicar conteos honestos y validar el montaje

**Files:**
- Modify: `src/lib/schematics/search.ts:65-90`
- Modify: `src/components/schematics/asset-tree.tsx`
- Modify: `src/components/schematics/workbench.tsx`
- Modify: `docs/schematics-architecture.md`
- Modify: `docs/schematics-ingestion-runbook.md`
- Test: `src/__tests__/schematics/catalog-search.test.ts`
- Test: `src/__tests__/schematics/workspace.test.ts`

**Interfaces:**
- Consumes: activos reconciliados e identidad publicada.
- Produces: `publishedTotal` y `heldForIdentity` junto con el árbol inicial.

- [ ] **Step 1: Write failing count test**

```ts
test("counts published assets and holds noisy identities", () => {
  const result = treeCatalog([
    asset({ id: "published", relativePath: "pcbe/Consolas/Xbox/Series X/board.pcbe", model: "Series X" }),
    asset({ id: "held", relativePath: "pdf/iPhone(VIP)/General/file.pdf", model: "General", kind: "pdf" }),
  ], { kind: "all" });
  assert.equal(result.publishedTotal, 1);
  assert.equal(result.heldForIdentity, 1);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npx tsx --test src/__tests__/schematics/catalog-search.test.ts`

Expected: tree results have no publication counts.

- [ ] **Step 3: Implement count propagation and admin-only signal**

Calculate both counts in `treeCatalog()` without client scans. Thread primitive values to the Workbench. `asset-tree.tsx` shows held count only to `canEditIdentity`; technicians see no pending folder. Use `useMemo` for local filtering and `useTransition` for non-urgent expansion/filter changes; add neither polling nor global listeners.

- [ ] **Step 4: Document mount and rollback contract**

Document that `SCHEMATICS_ROOT` must be the mounted root containing `catalog.json`, that the deployment snapshot is not a second authority, and rollback restores the prior source setting or disables reconciliation without deleting `/mnt/data2`.

- [ ] **Step 5: Run quality gates, visual verification and deploy**

Run: `npm test && npx tsc --noEmit && git diff --check && npm run build`

Then capture the authenticated local Workbench for Apple, Samsung, Motorola and `Consolas`; verify Nintendo 53, PlayStation 73, Steam Deck 8 and Xbox 49. Commit, push `main`, monitor the matching revision with `dokploy_maccell` to terminal state, and repeat the browser verification in production. Stop before production switch if the mount cannot expose the canonical catalog.
