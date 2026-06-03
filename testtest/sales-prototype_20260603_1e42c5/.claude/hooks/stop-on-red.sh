#!/usr/bin/env bash
# AEGIRA stop-on-red (PostToolUse) — Halt bei roter Risiko-Ampel.
set -euo pipefail
input=$(cat)
out=$(printf '%s' "$input" | jq -r '.tool_response // .tool_result // "" | tostring' 2>/dev/null || echo "")
if printf '%s' "$out" | grep -qiE 'ampel[\": ]*rot|\"red\"|risk[_-]?red'; then
  jq -n '{continue:false,stopReason:"Rote Risikoampel erkannt — HITL-PM-Approval erforderlich, bevor fortgesetzt wird."}'
fi
exit 0
