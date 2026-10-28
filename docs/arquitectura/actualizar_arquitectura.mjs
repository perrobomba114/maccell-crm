#!/usr/bin/env node
/**
 * Generador del mapa de arquitectura de MACCELL CRM.
 *
 * Lee el código real (git ls-files), fusiona por `id` con arquitectura.json y
 * arquitectura.overrides.json, valida y reescribe arquitectura.json + el
 * bloque `const M = {...};` de arquitectura.html. Sin dependencias externas.
 *
 * Uso: node docs/arquitectura/actualizar_arquitectura.mjs [--check] [--dry-run] [--backup] [--verbose] [--ia]
 * Códigos de salida: 0 = ok / al día, 1 = --check con mapa desactualizado, 2 = validación o error.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..", "..");
const REL_AQUI = path.relative(RAIZ, AQUI).split(path.sep).join("/");
const RUTA_JSON = path.join(AQUI, "arquitectura.json");
const RUTA_HTML = path.join(AQUI, "arquitectura.html");
const RUTA_OVERRIDES = path.join(AQUI, "arquitectura.overrides.json");

const args = new Set(process.argv.slice(2));
const OPC = {
  check: args.has("--check"),
  dryRun: args.has("--dry-run"),
  backup: args.has("--backup"),
  verbose: args.has("--verbose"),
  ia: args.has("--ia"),
};

const EXT_CODIGO = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sql", ".prisma", ".css", ".sh", ".yml", ".yaml"]);
const esCodigo = (rel) => EXT_CODIGO.has(path.extname(rel).toLowerCase()) || /^Dockerfile/.test(path.basename(rel));
// Excluidos en cualquier nivel (dependencias y artefactos de build) y solo en la raíz (datos, backups, herramientas).
// Ojo: "vendor" se excluye como dependencia, pero src/app/vendor y src/components/vendor son el panel Vendedor.
const EXCLUIDOS_EN_CUALQUIER_NIVEL = /(^|\/)(node_modules|\.git|dist|build|__pycache__|\.venv|\.next[^/]*)\//;
const EXCLUIDOS_EN_RAIZ = /^(backups|upload|output|outputs|coverage|vendor|\.claude|\.agents|\.superpowers|\.worktrees|\.playwright[^/]*)\//;
const EXCLUIDOS = { test: (r) => EXCLUIDOS_EN_CUALQUIER_NIVEL.test(r) || EXCLUIDOS_EN_RAIZ.test(r) };
const SECRETOS = /(^|\/)(\.env[^/]*|[^/]*\.(pem|key|keystore|p12|pfx|crt)|afip-certs\/.*|certificates\/.*)$/i;
const ES_TEST = /(^|\/)(__tests__|tests?)\/|\.test\.[a-z]+$|(^|\/)test_[^/]*\.py$/;
const ENV_IGNORADAS = new Set(["PATH", "CI", "NODE_ENV", "HOME", "JEST_WORKER_ID", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"]);
const COLORES = ["azul", "verde", "rojo", "amarillo", "violeta", "gris"];
const TIPOS = ["usa", "lee", "escribe", "llama", "evento"];
const ANCHO_NODO = 190;
const HOY = new Date();

const nf = new Intl.NumberFormat("es-AR");
const pad = (n) => String(n).padStart(2, "0");
const fechaHoy = () => `${HOY.getFullYear()}-${pad(HOY.getMonth() + 1)}-${pad(HOY.getDate())}`;
const marcaTiempo = () => `${HOY.getFullYear()}${pad(HOY.getMonth() + 1)}${pad(HOY.getDate())}_${pad(HOY.getHours())}${pad(HOY.getMinutes())}${pad(HOY.getSeconds())}`;
const log = (...m) => process.stdout.write(`${m.join(" ")}\n`);
const verbose = (...m) => { if (OPC.verbose) log("  ·", ...m); };

class ErrorValidacion extends Error {}

/* ---------- utilidades ---------- */

function leerJson(ruta) {
  if (!fs.existsSync(ruta)) return null;
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch (e) {
    throw new ErrorValidacion(`No se pudo leer ${path.relative(RAIZ, ruta)}: ${e.message}`);
  }
}

/** JSON con claves ordenadas: sirve para comparar de forma determinista. */
function canon(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canon).join(",")}]`;
  if (valor && typeof valor === "object") {
    return `{${Object.keys(valor).filter((k) => valor[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(valor[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor);
}

function sinVolatiles(m) {
  const copia = { ...m };
  delete copia.generado;
  delete copia.commit;
  return copia;
}

function git(...a) {
  try {
    return execFileSync("git", a, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function slug(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function globARegex(patron) {
  const esc = patron.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp(`^${esc}$`);
}

/* ---------- escaneo del código ---------- */

function listarArchivos() {
  const salida = git("ls-files", "-co", "--exclude-standard", "-z");
  let rutas;
  if (salida !== null) {
    rutas = salida.split("\0").filter(Boolean);
  } else {
    rutas = [];
    const caminar = (dir) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (!EXCLUIDOS.test(`${rel}/`)) caminar(rel);
        } else rutas.push(rel);
      }
    };
    caminar("");
  }
  return rutas
    .filter((r) => !EXCLUIDOS.test(r) && !SECRETOS.test(r) && fs.existsSync(path.join(RAIZ, r)))
    .sort();
}

function escanear() {
  const todos = listarArchivos();
  indexar(todos);
  const codigo = [];
  const envNombres = new Set();
  for (const rel of todos) {
    if (rel.startsWith(`${REL_AQUI}/`)) continue; // el propio mapa no cuenta como código del proyecto
    if (!esCodigo(rel)) continue;
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
    const lineas = texto === "" ? 0 : texto.split("\n").length - (texto.endsWith("\n") ? 1 : 0);
    const prueba = ES_TEST.test(rel);
    codigo.push({ rel, lineas, prueba, texto: prueba ? "" : texto });
    if (!prueba) {
      for (const re of [/process\.env\.([A-Z][A-Z0-9_]{2,})/g, /process\.env\[["']([A-Z][A-Z0-9_]{2,})["']\]/g, /os\.environ(?:\.get)?[\[(]\s*["']([A-Z][A-Z0-9_]{2,})["']/g, /getenv\(\s*["']([A-Z][A-Z0-9_]{2,})["']/g]) {
        for (const m of texto.matchAll(re)) if (!ENV_IGNORADAS.has(m[1])) envNombres.add(m[1]);
      }
    }
  }
  return { todos, codigo, inventario: construirInventario(codigo, envNombres) };
}

function construirInventario(codigo, envNombres) {
  const endpoints = [];
  const modelos = [];
  const tablasRag = [];
  for (const f of codigo) {
    if (/^src\/app\/api\/.*\/route\.ts$/.test(f.rel)) {
      const ruta = `/${f.rel.replace(/^src\/app\//, "").replace(/\/route\.ts$/, "")}`;
      const metodos = new Set();
      for (const m of f.texto.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) metodos.add(m[1]);
      for (const m of f.texto.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) metodos.add(m[1]);
      for (const metodo of [...metodos].sort()) endpoints.push(`${metodo} ${ruta}`);
    }
    if (f.rel.startsWith("services/") && f.rel.endsWith(".py")) {
      for (const m of f.texto.matchAll(/@app\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g)) endpoints.push(`${m[1].toUpperCase()} ${m[2]} (worker Python)`);
    }
    if (f.rel === "prisma/schema.prisma") for (const m of f.texto.matchAll(/^model\s+(\w+)/gm)) modelos.push(m[1]);
    if (f.rel.startsWith("services/") && f.rel.endsWith(".sql")) {
      for (const m of f.texto.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)) tablasRag.push(m[1]);
    }
  }
  const dependencias = [];
  const pkg = leerJsonSeguro(path.join(RAIZ, "package.json"));
  if (pkg) {
    for (const bloque of ["dependencies", "devDependencies"]) {
      for (const [n, v] of Object.entries(pkg[bloque] ?? {})) dependencias.push(`${n}@${v}`);
    }
  }
  const pyproject = path.join(RAIZ, "services/cerebro-rag-worker/pyproject.toml");
  if (fs.existsSync(pyproject)) {
    const txt = fs.readFileSync(pyproject, "utf8");
    const bloque = txt.match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m);
    if (bloque) for (const m of bloque[1].matchAll(/"([^"]+)"/g)) dependencias.push(`py:${m[1]}`);
  }
  const unicos = (a) => [...new Set(a)].sort();
  return {
    endpoints: unicos(endpoints),
    modelos: unicos(modelos),
    tablasRag: unicos(tablasRag),
    dependencias: unicos(dependencias),
    variablesEntorno: unicos([...envNombres]),
  };
}

function leerJsonSeguro(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

/* ---------- asignación de archivos a nodos ---------- */

function compilarRutas(rutas = []) {
  return rutas.map((r) => {
    const comodin = r.includes("*");
    const dir = r.endsWith("/");
    const re = comodin ? globARegex(r) : null;
    const puntaje = (comodin ? 0 : 1000) + r.length;
    const coincide = (rel) => (comodin ? re.test(rel) : dir ? rel.startsWith(r) : rel === r || rel.startsWith(`${r}/`));
    return { r, puntaje, coincide };
  });
}

function asignar(codigo, nodos) {
  const compiladas = nodos.map((n) => ({ id: n.id, reglas: compilarRutas(n.rutas) }));
  const porNodo = new Map(nodos.map((n) => [n.id, []]));
  const sinDueno = [];
  for (const f of codigo) {
    let mejor = null;
    for (const c of compiladas) {
      for (const regla of c.reglas) {
        if (regla.coincide(f.rel) && (!mejor || regla.puntaje > mejor.puntaje)) mejor = { id: c.id, puntaje: regla.puntaje };
      }
    }
    if (mejor) porNodo.get(mejor.id).push(f);
    else sinDueno.push(f);
  }
  return { porNodo, sinDueno };
}

function capaSugerida(dirClave) {
  if (/^src\/app\/api\//.test(dirClave)) return "api";
  if (/^src\/(app|components|hooks)\b/.test(dirClave)) return "entrada";
  if (/^src\/(actions|lib)\b/.test(dirClave)) return "negocio";
  if (/^(prisma)\b/.test(dirClave)) return "almacen";
  if (/^(scripts|services)\b/.test(dirClave)) return "jobs";
  return "infra";
}

function claveModulo(rel) {
  const partes = rel.split("/");
  if (partes.length === 1) return "(raiz)";
  return partes.slice(0, Math.min(partes.length - 1, 3)).join("/");
}

/* ---------- fusión ---------- */

function fusionar({ escaneo, previo, overrides }) {
  const reporte = { nuevos: [], obsoletos: [], reactivados: [], recontados: [], flechasNuevas: 0, flechasQuitadas: 0, sinDueno: [] };
  const capas = overrides.capas ?? previo?.capas ?? [];
  const capaIds = new Set(capas.map((c) => c.id));
  const previosPorId = new Map((previo?.nodes ?? []).map((n) => [n.id, n]));
  const ajustes = overrides.ajustes ?? {};

  // 1) definiciones curadas: overrides.nodes + nodos auto:false del JSON previo
  const curados = new Map();
  for (const n of previo?.nodes ?? []) if (n.auto === false) curados.set(n.id, { ...n });
  for (const n of overrides.nodes ?? []) curados.set(n.id, { ...(curados.get(n.id) ?? {}), ...n });

  // 2) nodos automáticos previos
  const autosPrevios = new Map();
  for (const n of previo?.nodes ?? []) if (n.auto === true && !curados.has(n.id)) autosPrevios.set(n.id, { ...n });

  // 3) detectar módulos nuevos sin dueño
  const base = [...curados.values(), ...autosPrevios.values()];
  const { sinDueno } = asignar(escaneo.codigo, base);
  const grupos = new Map();
  for (const f of sinDueno) {
    const clave = claveModulo(f.rel);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(f);
  }
  const todosLosNodos = [...curados.values(), ...autosPrevios.values()];
  for (const [clave] of [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const id = `auto-${slug(clave)}`;
    const dirRuta = clave === "(raiz)" ? null : `${clave}/`;
    const nodo = {
      id,
      nombre: clave === "(raiz)" ? "Archivos en la raíz" : clave.split("/").slice(-1)[0],
      capa: capaSugerida(clave),
      sub: clave === "(raiz)" ? "raíz del repositorio" : clave,
      desc: "Módulo detectado automáticamente; todavía no tiene descripción curada. Completala en arquitectura.overrides.json (sección \"ajustes\").",
      detalle: [],
      color: "gris",
      rutas: dirRuta ? [dirRuta] : sinDueno.filter((f) => !f.rel.includes("/")).map((f) => f.rel),
      auto: true,
      revisar: true,
    };
    if (!autosPrevios.has(id)) {
      autosPrevios.set(id, nodo);
      todosLosNodos.push(nodo);
      reporte.nuevos.push(id);
    } else if (clave === "(raiz)") {
      const existente = autosPrevios.get(id);
      existente.rutas = [...new Set([...(existente.rutas ?? []), ...nodo.rutas])].sort();
    }
  }
  // Un grupo cuyo nodo auto ya existía pero perdió cobertura se re-asigna sin avisar: ya está en `base`.
  reporte.sinDueno = [...grupos.keys()];

  // 4) asignación definitiva y construcción de nodos finales
  const { porNodo } = asignar(escaneo.codigo, todosLosNodos);
  const ocupadas = new Map();
  for (const n of todosLosNodos) if (capaIds.has(n.capa)) ocupadas.set(n.capa, [...(ocupadas.get(n.capa) ?? []), previosPorId.get(n.id)?.x ?? n.x ?? 0]);

  const finales = [];
  for (const n of todosLosNodos) {
    const prev = previosPorId.get(n.id);
    const archivosAsignados = porNodo.get(n.id) ?? [];
    const lineas = archivosAsignados.reduce((s, f) => s + f.lineas, 0);
    const existentes = (n.archivos ?? []).filter((a) => existeArchivo(a));
    const sinReglas = (n.rutas ?? []).length === 0;
    const vivo = sinReglas ? (n.archivos ?? []).length === 0 || existentes.length > 0 : archivosAsignados.length > 0;
    const ajuste = ajustes[n.id] ?? {};
    const out = {
      id: n.id,
      nombre: ajuste.nombre ?? n.nombre,
      capa: ajuste.capa ?? n.capa,
      x: ajuste.x ?? n.x ?? prev?.x,
      w: ajuste.w ?? n.w ?? prev?.w ?? ANCHO_NODO,
      sub: ajuste.sub ?? n.sub ?? "",
      desc: ajuste.desc ?? n.desc ?? "",
      detalle: ajuste.detalle ?? n.detalle ?? [],
      archivos: n.auto === true
        ? ajuste.archivos ?? archivosAsignados.filter((f) => !f.prueba).sort((a, b) => b.lineas - a.lineas || a.rel.localeCompare(b.rel)).slice(0, 8).map((f) => f.rel)
        : ajuste.archivos ?? n.archivos ?? [],
      color: ajuste.color ?? n.color ?? "gris",
      lineas,
      nArchivos: archivosAsignados.length,
      rutas: n.rutas ?? [],
      auto: n.auto === true,
    };
    if (n.y !== undefined || ajuste.y !== undefined) out.y = ajuste.y ?? n.y;
    if (n.auto === true && (n.revisar ?? prev?.revisar) && !ajuste.desc) out.revisar = true;
    if (!vivo) out.obsoleto = true;
    if (out.x === undefined) {
      const usados = ocupadas.get(out.capa) ?? [];
      out.x = (usados.length ? Math.max(...usados) : 0) + ANCHO_NODO + 24;
      ocupadas.set(out.capa, [...usados, out.x]);
    }
    if (prev) {
      if (!prev.obsoleto && out.obsoleto) reporte.obsoletos.push(out.id);
      else if (prev.obsoleto && !out.obsoleto) reporte.reactivados.push(out.id);
      if (prev.lineas !== out.lineas || prev.nArchivos !== out.nArchivos) reporte.recontados.push(out.id);
    }
    finales.push(out);
  }
  finales.sort((a, b) => capas.findIndex((c) => c.id === a.capa) - capas.findIndex((c) => c.id === b.capa) || a.x - b.x || a.id.localeCompare(b.id));

  const edges = overrides.edges ?? previo?.edges ?? [];
  const viejas = new Set((previo?.edges ?? []).map((e) => `${e.from}>${e.to}>${e.label}`));
  const nuevas = new Set(edges.map((e) => `${e.from}>${e.to}>${e.label}`));
  reporte.flechasNuevas = [...nuevas].filter((k) => !viejas.has(k)).length;
  reporte.flechasQuitadas = [...viejas].filter((k) => !nuevas.has(k)).length;

  const codigoReal = escaneo.codigo.filter((f) => !f.prueba);
  const conteoExt = new Map();
  for (const f of codigoReal) {
    const lang = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".py": "Python", ".sql": "SQL", ".prisma": "Prisma", ".css": "CSS", ".sh": "Shell" }[path.extname(f.rel)] ?? "Otro";
    conteoExt.set(lang, (conteoExt.get(lang) ?? 0) + f.lineas);
  }
  const totalLineas = codigoReal.reduce((s, f) => s + f.lineas, 0);
  const lenguajes = [...conteoExt.entries()].filter(([l]) => !["SQL", "CSS", "Shell", "Prisma", "Otro"].includes(l)).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([l, n]) => `${l} ${Math.round((n / totalLineas) * 100)}%`).join(" · ");
  const automaticos = {
    lenguaje: lenguajes,
    base: escaneo.inventario.modelos.length ? `PostgreSQL (Prisma, ${escaneo.inventario.modelos.length} modelos) + base RAG (${escaneo.inventario.tablasRag.length} tablas)` : "sin esquema detectado",
    modulos: String(codigoReal.length),
    lineas: nf.format(totalLineas),
    endpoints: String(escaneo.inventario.endpoints.length),
    "variables de entorno": String(escaneo.inventario.variablesEntorno.length),
  };
  const resumen = Object.entries({ ...automaticos, ...(overrides.resumen ?? {}) }).map(([k, v]) => [k, v]);

  const mapa = {
    proyecto: overrides.proyecto ?? previo?.proyecto ?? path.basename(RAIZ),
    generado: previo?.generado ?? fechaHoy(),
    commit: previo?.commit ?? "",
    resumen,
    capas,
    nodes: finales,
    edges,
    flows: overrides.flows ?? previo?.flows ?? [],
    inventario: escaneo.inventario,
  };
  return { mapa, reporte, modulos: codigoReal.length, lineas: totalLineas };
}

/** Un archivo "existe" si está en el escaneo (así CI y las copias limpias coinciden con tu máquina). */
const INDICE = { archivos: new Set(), carpetas: new Set() };

function indexar(todos) {
  for (const rel of todos) {
    INDICE.archivos.add(rel);
    const partes = rel.split("/");
    for (let i = 1; i < partes.length; i++) INDICE.carpetas.add(partes.slice(0, i).join("/"));
  }
}

function existeArchivo(ref) {
  const p = ref.split("::")[0].trim().replace(/\/$/, "");
  return INDICE.archivos.has(p) || INDICE.carpetas.has(p);
}

/* ---------- validación ---------- */

function validar(mapa) {
  const errores = [];
  const ids = new Set();
  for (const n of mapa.nodes) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(n.id)) errores.push(`id inválido (solo minúsculas, números y guiones): "${n.id}"`);
    if (ids.has(n.id)) errores.push(`id duplicado: ${n.id}`);
    ids.add(n.id);
    if (!mapa.capas.some((c) => c.id === n.capa)) errores.push(`El nodo ${n.id} usa una capa inexistente: ${n.capa}`);
    if (!COLORES.includes(n.color)) errores.push(`El nodo ${n.id} tiene un color inválido: ${n.color}`);
    if (!Number.isFinite(n.x)) errores.push(`El nodo ${n.id} no tiene posición x`);
    if (!n.obsoleto) for (const a of n.archivos) if (!existeArchivo(a)) errores.push(`El nodo ${n.id} cita un archivo que no existe: ${a}`);
  }
  const capaIds = new Set();
  for (const c of mapa.capas) {
    if (capaIds.has(c.id)) errores.push(`capa duplicada: ${c.id}`);
    capaIds.add(c.id);
  }
  for (const e of mapa.edges) {
    if (!ids.has(e.from)) errores.push(`Flecha "${e.label}": el origen no existe (${e.from})`);
    if (!ids.has(e.to)) errores.push(`Flecha "${e.label}": el destino no existe (${e.to})`);
    if (e.from === e.to) errores.push(`Flecha "${e.label}": origen y destino son el mismo nodo (${e.from})`);
    if (!TIPOS.includes(e.tipo)) errores.push(`Flecha "${e.label}": tipo inválido (${e.tipo})`);
  }
  const flujoIds = new Set();
  for (const f of mapa.flows) {
    if (flujoIds.has(f.id)) errores.push(`flujo duplicado: ${f.id}`);
    flujoIds.add(f.id);
    if (!COLORES.includes(f.color)) errores.push(`El flujo ${f.id} tiene un color inválido: ${f.color}`);
    for (const s of f.steps) if (!ids.has(s.n)) errores.push(`El flujo ${f.id} referencia un nodo inexistente: ${s.n}`);
    for (const a of f.archivos ?? []) {
      const [ruta, resto] = a.split("::");
      if (!existeArchivo(ruta)) {
        errores.push(`El flujo ${f.id} cita un archivo que no existe: ${ruta}`);
        continue;
      }
      const simbolo = resto?.trim().match(/^[\w$]+/)?.[0];
      if (simbolo && !fs.readFileSync(path.join(RAIZ, ruta.trim()), "utf8").includes(simbolo)) errores.push(`El flujo ${f.id} cita ${ruta}::${simbolo} pero ese símbolo no está en el archivo`);
    }
  }
  for (const [clave, lista] of Object.entries(mapa.inventario)) if (!Array.isArray(lista)) errores.push(`inventario.${clave} inválido`);
  return errores;
}

/* ---------- HTML ---------- */

const RE_LINEA_M = /^const M = .*;$/gm;

function leerMDelHtml() {
  if (!fs.existsSync(RUTA_HTML)) throw new ErrorValidacion(`Falta ${path.relative(RAIZ, RUTA_HTML)} (visor).`);
  const html = fs.readFileSync(RUTA_HTML, "utf8");
  const coincidencias = html.match(RE_LINEA_M) ?? [];
  if (coincidencias.length !== 1) throw new ErrorValidacion(`El HTML debe tener EXACTAMENTE una línea "const M = {...};" (encontradas: ${coincidencias.length}).`);
  const json = coincidencias[0].slice("const M = ".length, -1);
  let datos = null;
  try {
    datos = JSON.parse(json);
  } catch {
    datos = null; // placeholder inicial o línea corrupta: se reescribe
  }
  return { html, datos };
}

function incrustar(html, mapa) {
  const json = JSON.stringify(mapa).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return html.replace(RE_LINEA_M, () => `const M = ${json};`);
}

/* ---------- escritura ---------- */

function escribirAtomico(pares) {
  const temporales = [];
  try {
    for (const [destino, contenido] of pares) {
      const tmp = `${destino}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, contenido, "utf8");
      temporales.push([tmp, destino]);
    }
    for (const [tmp, destino] of temporales) fs.renameSync(tmp, destino);
  } finally {
    for (const [tmp] of temporales) if (fs.existsSync(tmp)) fs.rmSync(tmp);
  }
}

function respaldar(destinos) {
  const sello = marcaTiempo();
  for (const d of destinos) {
    if (!fs.existsSync(d)) continue;
    fs.copyFileSync(d, `${d}.bak_${sello}`);
    const base = path.basename(d);
    const viejos = fs.readdirSync(AQUI).filter((f) => f.startsWith(`${base}.bak_`)).sort();
    for (const f of viejos.slice(0, Math.max(0, viejos.length - 3))) fs.rmSync(path.join(AQUI, f));
  }
}

/* ---------- IA opcional ---------- */

async function redactarConIA(mapa, ids) {
  const url = process.env.ARQ_IA_BASE_URL;
  const clave = process.env.ARQ_IA_API_KEY;
  const modelo = process.env.ARQ_IA_MODEL;
  if (!url || !clave || !modelo) {
    log("⚠ --ia necesita ARQ_IA_BASE_URL, ARQ_IA_API_KEY y ARQ_IA_MODEL; se omite la redacción con IA.");
    return;
  }
  for (const id of ids) {
    const n = mapa.nodes.find((x) => x.id === id);
    if (!n) continue;
    // Solo se envían nombres de carpeta y de archivo: nunca contenido del código.
    const pedido = `Explicá en 1-2 frases, en español simple y para alguien que no programa, qué hace un módulo de un CRM de reparaciones llamado "${n.nombre}" que contiene estos archivos: ${n.archivos.join(", ")}. Sin inventar nada que no se deduzca de los nombres.`;
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${clave}` },
        body: JSON.stringify({ model: modelo, messages: [{ role: "user", content: pedido }] }),
      });
      const datos = await r.json();
      const texto = datos?.choices?.[0]?.message?.content;
      if (typeof texto === "string" && texto.trim()) {
        n.desc = texto.trim();
        n.revisar = true;
      }
    } catch (e) {
      log(`⚠ --ia falló para ${id}: ${e.message}`);
    }
  }
}

/* ---------- informe ---------- */

function diferenciasInventario(previo, nuevo) {
  const partes = [];
  const nombres = { endpoints: ["endpoint", "endpoints"], modelos: ["modelo", "modelos"], tablasRag: ["tabla RAG", "tablas RAG"], dependencias: ["dependencia", "dependencias"], variablesEntorno: ["variable de entorno", "variables de entorno"] };
  for (const [clave, [singular, plural]] of Object.entries(nombres)) {
    const antes = new Set(previo?.inventario?.[clave] ?? []);
    const ahora = new Set(nuevo[clave]);
    const mas = [...ahora].filter((x) => !antes.has(x));
    const menos = [...antes].filter((x) => !ahora.has(x));
    if (mas.length) partes.push({ txt: `+${mas.length} ${mas.length > 1 ? plural : singular}`, det: mas.map((x) => `+ ${x}`) });
    if (menos.length) partes.push({ txt: `-${menos.length} ${menos.length > 1 ? plural : singular}`, det: menos.map((x) => `- ${x}`) });
  }
  return partes;
}

function resumenLinea(reporte, previo, mapa, modulos, lineas) {
  const nodos = [];
  if (!previo) nodos.push(`${mapa.nodes.length} creados (primera generación)`);
  if (reporte.nuevos.length) nodos.push(`+${reporte.nuevos.length} nuevo${reporte.nuevos.length > 1 ? "s" : ""}`);
  if (reporte.obsoletos.length) nodos.push(`${reporte.obsoletos.length} obsoleto${reporte.obsoletos.length > 1 ? "s" : ""}`);
  if (reporte.reactivados.length) nodos.push(`${reporte.reactivados.length} reactivado${reporte.reactivados.length > 1 ? "s" : ""}`);
  if (reporte.recontados.length) nodos.push(`${reporte.recontados.length} recontado${reporte.recontados.length > 1 ? "s" : ""}`);
  const flechas = [];
  if (reporte.flechasNuevas) flechas.push(`+${reporte.flechasNuevas}`);
  if (reporte.flechasQuitadas) flechas.push(`-${reporte.flechasQuitadas}`);
  return `Nodos: ${nodos.join(", ") || "sin cambios"} · Flechas: ${flechas.join(" ") || "sin cambios"} · Módulos: ${nf.format(modulos)} · Líneas: ${nf.format(lineas)}`;
}

/* ---------- principal ---------- */

async function main() {
  const overrides = leerJson(RUTA_OVERRIDES) ?? {};
  const previo = leerJson(RUTA_JSON);
  if (!overrides.capas && !previo) throw new ErrorValidacion("No hay capas definidas: creá arquitectura.overrides.json.");
  const escaneo = escanear();
  const { mapa, reporte, modulos, lineas } = fusionar({ escaneo, previo, overrides });

  const errores = validar(mapa);
  if (errores.length) {
    process.stderr.write(`✖ Validación fallida (no se escribió nada):\n${errores.map((e) => `  - ${e}`).join("\n")}\n`);
    process.exitCode = 2;
    return;
  }
  if (OPC.ia && !OPC.check && !OPC.dryRun && reporte.nuevos.length) await redactarConIA(mapa, reporte.nuevos);

  const { html, datos: mHtml } = leerMDelHtml();
  const jsonCambio = !previo || canon(sinVolatiles(previo)) !== canon(sinVolatiles(mapa));
  const htmlCambio = !mHtml || canon(sinVolatiles(mHtml)) !== canon(sinVolatiles(mapa));
  const desactualizado = jsonCambio || htmlCambio;

  log(resumenLinea(reporte, previo, mapa, modulos, lineas));
  for (const parte of diferenciasInventario(previo, mapa.inventario)) log(`Inventario: ${parte.txt}`);
  if (reporte.nuevos.length) log(`Nodos nuevos (revisar descripción): ${reporte.nuevos.join(", ")}`);
  if (reporte.obsoletos.length) log(`Nodos marcados obsoletos (no se borran solos): ${reporte.obsoletos.join(", ")}`);
  if (reporte.reactivados.length) log(`Nodos reactivados: ${reporte.reactivados.join(", ")}`);
  if (OPC.verbose || OPC.dryRun) {
    for (const parte of diferenciasInventario(previo, mapa.inventario)) {
      for (const d of parte.det.slice(0, 15)) log(`    ${d}`);
      if (parte.det.length > 15) log(`    … y ${parte.det.length - 15} más`);
    }
    for (const id of reporte.recontados) {
      const antes = previo?.nodes.find((n) => n.id === id);
      const ahora = mapa.nodes.find((n) => n.id === id);
      log(`    recontado ${id}: ${antes?.lineas ?? 0} → ${ahora.lineas} líneas, ${antes?.nArchivos ?? 0} → ${ahora.nArchivos} archivos`);
    }
  }
  if (OPC.verbose) for (const n of mapa.nodes) verbose(`${n.id.padEnd(26)} ${String(n.nArchivos).padStart(4)} archivos ${nf.format(n.lineas).padStart(8)} líneas${n.obsoleto ? " [obsoleto]" : ""}${n.auto ? " [auto]" : ""}`);

  if (OPC.check) {
    if (desactualizado) {
      process.stderr.write("✖ El mapa de arquitectura está desactualizado. Corré: npm run arq   (y commiteá docs/arquitectura/)\n");
      process.exitCode = 1;
    } else log("✔ El mapa de arquitectura está al día.");
    return;
  }
  if (!desactualizado) {
    log("✔ 0 cambios: el mapa ya estaba al día.");
    return;
  }
  if (OPC.dryRun) {
    log("(dry-run) Se actualizarían: " + [jsonCambio ? "arquitectura.json" : null, htmlCambio ? "arquitectura.html" : null].filter(Boolean).join(", "));
    return;
  }

  const sha = (git("rev-parse", "--short", "HEAD") ?? "").trim() || "sin-git";
  mapa.generado = fechaHoy();
  mapa.commit = sha;
  if (OPC.backup) respaldar([RUTA_JSON, RUTA_HTML]);
  escribirAtomico([
    [RUTA_JSON, `${JSON.stringify(mapa, null, 2)}\n`],
    [RUTA_HTML, incrustar(html, mapa)],
  ]);
  log(`✔ Mapa actualizado (${mapa.generado}, commit ${sha}).`);
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof ErrorValidacion ? e.message : e.stack}\n`);
  process.exitCode = 2;
});
