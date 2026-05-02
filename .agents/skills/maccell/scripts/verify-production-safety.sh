#!/usr/bin/env bash
set -u

WITH_BUILD=0
if [[ "${1:-}" == "--with-build" ]]; then
  WITH_BUILD=1
fi

if [[ ! -f package.json ]]; then
  echo "ERROR: ejecutar desde la raiz del repo MACCELL." >&2
  exit 2
fi

status=0

section() {
  printf '\n== %s ==\n' "$1"
}

run_check() {
  local name="$1"
  shift
  section "$name"
  if "$@"; then
    echo "PASS: $name"
  else
    local code=$?
    echo "FAIL: $name (exit $code)"
    status=1
  fi
}

changed_files() {
  { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u
}

changed_ts() {
  changed_files | grep -E '\.(ts|tsx)$' || true
}

section "Archivos tocados"
changed_files

run_check "TypeScript" npx tsc --noEmit
run_check "Whitespace/conflict markers" git diff --check

section "ESLint archivos TS/TSX tocados"
CHANGED_TS="$(changed_ts)"
if [[ -n "$CHANGED_TS" ]]; then
  if printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet; then
    echo "PASS: ESLint archivos tocados"
  else
    code=$?
    echo "FAIL: ESLint archivos tocados (exit $code)"
    status=1
  fi
else
  echo "SKIP: no hay archivos TS/TSX tocados"
fi

section "Anti-patrones en archivos TS/TSX tocados"
if [[ -n "$CHANGED_TS" ]]; then
  if printf '%s\n' "$CHANGED_TS" | xargs rg -n "console\.log|catch\s*\([^)]*\)\s*=>\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\{\s*\}|secure:\s*false|JSON\.parse\(JSON\.stringify|prisma as any|\(prisma as any\)|as any|: any|setInterval\(|setTimeout\("; then
    echo "REVIEW: se encontraron anti-patrones potenciales. Justificar o corregir antes de cerrar."
  else
    echo "PASS: sin anti-patrones detectados por busqueda"
  fi
else
  echo "SKIP: no hay archivos TS/TSX tocados"
fi

section "Any explicitos en archivos TS/TSX tocados"
if [[ -n "$CHANGED_TS" ]]; then
  if printf '%s\n' "$CHANGED_TS" | xargs rg -n "\bany\b|as any|\(.* as any\)"; then
    echo "FAIL: quedan any explicitos en archivos tocados. Reemplazar por tipos concretos/unknown o documentar TECH_DEBT excepcional."
    status=1
  else
    echo "PASS: sin any explicitos en archivos tocados"
  fi
else
  echo "SKIP: no hay archivos TS/TSX tocados"
fi

section "Tests"
if node -e "const p=require('./package.json'); process.exit(p.scripts?.test ? 0 : 1)"; then
  if npm test; then
    echo "PASS: npm test"
  else
    code=$?
    echo "FAIL: npm test (exit $code)"
    status=1
  fi
else
  echo "SKIP: package.json no define scripts.test"
fi

if [[ "$WITH_BUILD" -eq 1 ]]; then
  run_check "Production build" npm run build
else
  section "Production build"
  echo "SKIP: usar --with-build para ejecutar npm run build"
fi

exit "$status"
