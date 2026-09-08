#!/bin/sh
set -eu
node ./node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
if ! node scripts/register-schematic-additions.mjs; then
  echo '[SCHEMATICS IMPORT] La importación complementaria falló; el CRM continúa y la biblioteca requiere revisión. Consultá el error anterior.' >&2
fi
index_pid=''
if [ "${SCHEMATICS_BACKGROUND_INDEXING:-false}" = 'true' ]; then
  OMP_THREAD_LIMIT=1 SCHEMATICS_INDEX_CONCURRENCY=1 node scripts/technical-worker.cjs --watch &
  index_pid=$!
fi
node server.js &
web_pid=$!
cleanup() {
  if [ -n "$index_pid" ]; then kill "$index_pid" 2>/dev/null || true; fi
  kill "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
wait "$web_pid"
