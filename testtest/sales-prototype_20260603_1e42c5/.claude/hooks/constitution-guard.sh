#!/usr/bin/env bash
# AEGIRA constitution-guard (PreToolUse) — Zone-2-Schreibschutz.
# Blockt Write/Edit auf 00_CLAUDE_KNOWLEDGE_ARCHITECTURE/** (Constitution).
set -euo pipefail
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // ""')
case "$path" in
  *00_CLAUDE_KNOWLEDGE_ARCHITECTURE/*)
    jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Zone-2-Pfad — Schreibzugriff auf die Constitution ist gesperrt (AEGIRA-Constitution)."}}'
    exit 0 ;;
esac
exit 0
