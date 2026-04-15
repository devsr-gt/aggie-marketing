#!/usr/bin/env bash
# security-check.sh
# Fetches the latest Node.js and Docker (moby) releases from GitHub,
# highlights any CVEs or security releases, and logs the result daily.
#
# Usage:
#   ./scripts/security-check.sh          # print report + log it
#   ./scripts/security-check.sh --quiet  # log only, no stdout (used by LaunchAgent)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/security"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
QUIET=false

[[ "${1:-}" == "--quiet" ]] && QUIET=true

# ── Helpers ───────────────────────────────────────────────────────────────────
print()  { $QUIET || echo "$*"; }
header() { print ""; print "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; print "  $*"; print "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }
warn()   { print "  ⚠  $*"; }
ok()     { print "  ✓  $*"; }
info()   { print "  →  $*"; }

fetch_releases() {
  # $1 = owner/repo, $2 = how many to fetch
  local repo="$1" count="${2:-5}"
  curl -sSf \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    --max-time 15 \
    "https://api.github.com/repos/${repo}/releases?per_page=${count}" \
    2>/dev/null
}

# Parse with Python 3 (always available on macOS, no jq dependency)
parse_releases() {
  python3 - "$1" <<'PYEOF'
import sys, json, re

data_str = sys.argv[1]
releases = json.loads(data_str)
found_security = False

for r in releases:
    tag  = r.get("tag_name", "")
    name = r.get("name", tag)
    date = r.get("published_at", "")[:10]
    body = r.get("body", "")
    url  = r.get("html_url", "")

    # Look for CVE numbers or the word "security" in the release body/name
    cves     = re.findall(r'CVE-\d{4}-\d+', body)
    is_sec   = bool(cves) or "security" in body.lower() or "security" in name.lower()

    if is_sec:
        found_security = True
        print(f"  [SECURITY] {name} ({date})")
        print(f"             {url}")
        for cve in sorted(set(cves)):
            print(f"             {cve}")
    else:
        print(f"  [OK]       {name} ({date})")

if not found_security:
    print("  No security issues found in the most recent releases.")
PYEOF
}

# ── Main ──────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

{
  TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

  header "Aggie Marketing — Daily Security Check  [$TIMESTAMP]"

  # ── Node.js ────────────────────────────────────────────────────────────────
  print ""
  print "NODE.JS (github.com/nodejs/node)"
  print "─────────────────────────────────────────────────────"
  NODE_JSON="$(fetch_releases nodejs/node 5)" && {
    parse_releases "$NODE_JSON"
  } || {
    warn "Could not reach GitHub — check your internet connection."
  }

  # ── Docker (moby) ─────────────────────────────────────────────────────────
  print ""
  print "DOCKER ENGINE (github.com/moby/moby)"
  print "─────────────────────────────────────────────────────"
  DOCKER_JSON="$(fetch_releases moby/moby 5)" && {
    # Filter to docker-v* tags only (skip API and SDK sub-releases)
    DOCKER_FILTERED="$(python3 -c "
import sys, json
data = json.loads(sys.stdin.read())
filtered = [r for r in data if r.get('tag_name','').startswith('docker-v')]
print(json.dumps(filtered[:3]))
" <<< "$DOCKER_JSON")"
    parse_releases "$DOCKER_FILTERED"
  } || {
    warn "Could not reach GitHub — check your internet connection."
  }

  # ── Summary ───────────────────────────────────────────────────────────────
  print ""
  print "Node.js security advisories : https://nodejs.org/en/blog/vulnerability"
  print "Docker security advisories  : https://docs.docker.com/engine/release-notes"
  print ""

} | tee "$LOG_FILE"

$QUIET || echo "  Log saved → $LOG_FILE"
