#!/bin/sh
# Inicia Next (porta interna) e Express na 3000 com proxy para o painel — um único container.
set -e

NEXT_PID=""
API_PID=""

cleanup() {
  if [ -n "$API_PID" ]; then
    kill -TERM "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$NEXT_PID" ]; then
    kill -TERM "$NEXT_PID" 2>/dev/null || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
}

trap 'cleanup; exit 0' TERM INT

export NODE_ENV=production
export PORT=3001
export HOSTNAME=127.0.0.1

(cd /app/next && node server.js) &
NEXT_PID=$!

i=0
while [ "$i" -lt 90 ]; do
  if curl -sf --max-time 2 "http://127.0.0.1:3001/login" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

if ! curl -sf --max-time 2 "http://127.0.0.1:3001/login" >/dev/null 2>&1; then
  echo "agendador: Next não respondeu em 127.0.0.1:3001 a tempo." >&2
  cleanup
  exit 1
fi

export PROXY_NEXT_DEV=1
export NEXT_DEV_PROXY_TARGET=http://127.0.0.1:3001
export PORT=3000
export HOST=0.0.0.0
cd /app

node src/index.js &
API_PID=$!

set +e
wait "$API_PID"
_EXIT=$?
set -e
cleanup
exit "$_EXIT"
