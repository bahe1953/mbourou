#!/usr/bin/env sh
# Mbourou — démarrage (Linux / macOS)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé (version 22.13 ou plus récente requise)."; exit 1
fi
( sleep 2; (xdg-open http://localhost:3000 || open http://localhost:3000) >/dev/null 2>&1 ) &
exec node server.js
