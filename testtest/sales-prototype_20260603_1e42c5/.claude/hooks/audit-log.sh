#!/usr/bin/env bash
# AEGIRA audit-log (PostToolUse) — append-only Tool-Audit.
set -euo pipefail
input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // "?"')
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
dir="${CLAUDE_PROJECT_DIR:-.}/.harness"
mkdir -p "$dir"
printf '%s\t%s\n' "$ts" "$tool" >> "$dir/audit.log"
exit 0
