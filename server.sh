#!/usr/bin/env bash
# Fast local launcher for Linux and macOS.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8081}"
URL="http://localhost:${PORT}/game.html"

cd "$ROOT_DIR"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install it with your package manager and run this script again." >&2
  exit 1
fi

echo "T-34/85 is running at ${URL}"
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true) &
elif command -v open >/dev/null 2>&1; then
  (sleep 1; open "$URL" >/dev/null 2>&1 || true) &
fi

exec python3 -m http.server "$PORT"
