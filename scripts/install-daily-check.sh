#!/usr/bin/env bash
# install-daily-check.sh
# Installs a macOS LaunchAgent that runs the security check every day at 8:00 AM.
# The results are logged to logs/security/YYYY-MM-DD.log
#
# Usage:
#   ./scripts/install-daily-check.sh           # install
#   ./scripts/install-daily-check.sh --remove  # uninstall

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_LABEL="com.aggie-marketing.security-check"
PLIST_DEST="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
CHECK_SCRIPT="$SCRIPT_DIR/security-check.sh"

# ── Remove ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--remove" ]]; then
  echo ""
  if [[ -f "$PLIST_DEST" ]]; then
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    rm "$PLIST_DEST"
    echo "  ✓  Daily security check uninstalled."
  else
    echo "  Nothing to remove — LaunchAgent not found."
  fi
  echo ""
  exit 0
fi

# ── Install ───────────────────────────────────────────────────────────────────
mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$PROJECT_ROOT/logs/security"

# Write the plist with the REAL absolute path to this project's security-check.sh
cat > "$PLIST_DEST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Unique label — must match the filename -->
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <!-- Run this script every day at 08:00 AM -->
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${CHECK_SCRIPT}</string>
    <string>--quiet</string>
  </array>

  <!-- Schedule: daily at 8:00 AM -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <!-- Log stdout and stderr in case of errors -->
  <key>StandardOutPath</key>
  <string>${PROJECT_ROOT}/logs/security/launchd-stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${PROJECT_ROOT}/logs/security/launchd-error.log</string>

  <!-- Only run if on AC power OR battery (always run regardless of power) -->
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

# Load it into launchd
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo ""
echo "  ✓  Daily security check installed."
echo ""
echo "  Runs every day at 8:00 AM."
echo "  Logs → $PROJECT_ROOT/logs/security/"
echo ""
echo "  To run it right now:  ./scripts/security-check.sh"
echo "  To uninstall:         ./scripts/install-daily-check.sh --remove"
echo ""
