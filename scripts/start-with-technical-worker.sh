#!/bin/sh
set -eu
node ./node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
if ! node scripts/register-schematic-additions.mjs; then
  echo '[SCHEMATICS IMPORT] La importación complementaria falló; el CRM continúa y la biblioteca requiere revisión. Consultá el error anterior.' >&2
fi
OMP_THREAD_LIMIT=1 node scripts/technical-worker.cjs --watch --priority=21b135823617fc160f1bda3cc39d5bcdf942a80813cc03d4be4f0c9a1c5836de &
index_pid=$!
node server.js &
web_pid=$!
cleanup() {
  kill "$index_pid" "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
wait "$web_pid"
