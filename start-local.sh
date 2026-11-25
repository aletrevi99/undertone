#!/bin/bash
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Node.js is missing. Install version 22.13 or newer and run this again."; exit 1; }
[ -d node_modules ] || npm install || exit 1
npm run build || exit 1
export PORT="${PORT:-8787}" DATA_DIR="${DATA_DIR:-./data}" CONNECTIONS_DIR="${CONNECTIONS_DIR:-./connections}"
mkdir -p "$CONNECTIONS_DIR"
echo; echo "Undertone: http://localhost:$PORT   (Ctrl+C to stop)"; echo
exec node dist/server.mjs
