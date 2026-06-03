#!/usr/bin/env bash
# AEGIRA checkpoint (Stop) — markiert Lauf-Ende im Audit-Log.
set -euo pipefail
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
dir="${CLAUDE_PROJECT_DIR:-.}/.harness"
mkdir -p "$dir"
printf '%s\tSTOP\tcheckpoint\n' "$ts" >> "$dir/audit.log"
exit 0
