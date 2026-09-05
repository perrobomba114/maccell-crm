#!/bin/sh
set -eu
node ./node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
OMP_THREAD_LIMIT=1 node scripts/technical-worker.cjs --watch &
index_pid=$!
node server.js &
web_pid=$!
cleanup() { kill "$index_pid" "$web_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
wait "$web_pid"
