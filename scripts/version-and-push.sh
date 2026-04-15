#!/usr/bin/env bash
# version-and-push.sh
# Bumps the semantic version in app/package.json, commits, tags, and pushes.
#
# Usage:
#   ./scripts/version-and-push.sh patch    # 1.0.0 → 1.0.1  (bug fixes)
#   ./scripts/version-and-push.sh minor    # 1.0.0 → 1.1.0  (new feature)
#   ./scripts/version-and-push.sh major    # 1.0.0 → 2.0.0  (breaking change)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGE_JSON="$PROJECT_ROOT/app/package.json"

# ── Validate input ────────────────────────────────────────────────────────────
BUMP="${1:-}"
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo ""
  echo "Usage: ./scripts/version-and-push.sh <patch|minor|major>"
  echo ""
  echo "  patch  →  bug fixes           (1.0.0 → 1.0.1)"
  echo "  minor  →  new feature         (1.0.0 → 1.1.0)"
  echo "  major  →  breaking change     (1.0.0 → 2.0.0)"
  echo ""
  exit 1
fi

# ── Read current version ──────────────────────────────────────────────────────
CURRENT="$(python3 -c "import json; d=json.load(open('$PACKAGE_JSON')); print(d['version'])")"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# ── Bump ──────────────────────────────────────────────────────────────────────
case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo ""
echo "  Bumping version:  $CURRENT  →  $NEW_VERSION  ($BUMP)"
echo ""

# ── Write to package.json ─────────────────────────────────────────────────────
python3 - <<PYEOF
import json

with open("$PACKAGE_JSON", "r") as f:
    data = json.load(f)

data["version"] = "$NEW_VERSION"

with open("$PACKAGE_JSON", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("  ✓  app/package.json updated")
PYEOF

# ── Git: commit, tag, push ────────────────────────────────────────────────────
cd "$PROJECT_ROOT"

git add app/package.json
git commit -m "chore: release v${NEW_VERSION}"
git tag -a "v${NEW_VERSION}" -m "Version ${NEW_VERSION}"

echo ""
echo "  Pushing to origin..."
git push origin HEAD
git push origin "v${NEW_VERSION}"

echo ""
echo "  ✓  Released v${NEW_VERSION}"
echo "     https://github.com/devsr-gt/aggie-marketing/releases/tag/v${NEW_VERSION}"
echo ""
