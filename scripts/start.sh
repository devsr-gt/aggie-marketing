#!/usr/bin/env bash
# start.sh
# Safe startup wrapper: runs the daily security check FIRST,
# then starts the Docker container.
#
# Use this instead of running 'docker compose up -d' directly.
#
# Usage:
#   ./scripts/start.sh          # security check + start container
#   ./scripts/start.sh --stop   # stop the container

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ "${1:-}" == "--stop" ]]; then
  echo ""
  echo "  Stopping Aggie Marketing app..."
  cd "$PROJECT_ROOT"
  docker compose down
  echo "  ✓  Stopped."
  echo ""
  exit 0
fi

# ── Run security check ────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Running security check before startup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
"$SCRIPT_DIR/security-check.sh" || {
  echo ""
  echo "  Security check failed (no internet?). Continuing anyway."
  echo "  Run ./scripts/security-check.sh manually when back online."
  echo ""
}

# ── Start container ───────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Aggie Marketing app..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$PROJECT_ROOT"
docker compose up -d --build

echo ""
echo "  ✓  Running at http://127.0.0.1:3000"
echo ""
echo "  To stop:  ./scripts/start.sh --stop"
echo "  To logs:  docker compose logs -f"
echo ""
