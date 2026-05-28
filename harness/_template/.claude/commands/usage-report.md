---
name: usage-report
description: Token- und Tool-Call-Übersicht des aktuellen Runs.
args: []
---

# /usage-report

## Workflow
1. `.harness/<run-id>/state.json` und `.harness/<run-id>/logs/*.jsonl` lesen.
2. Aggregieren: Tokens pro Knoten, Tool-Calls pro Tool, Dauer pro Subagent.
3. Kosten-Schätzung basierend auf Modell-Pricing in `.env::LLM_MODEL`.

## Output-Format
```
Run-ID: <id>  ·  Modell: claude-sonnet-4-6  ·  Dauer: 23 min
─────────────────────────────────────────────────────
Tokens Total: 487.123 (Input 312.000 / Output 175.123)
Kosten:      ≈ 1.47 €

Tool-Calls Top-5:
  github_read_file              42
  github_write_file             18
  github_create_issue            7
  github_list_milestones         4
  github_whoami                  1

Subagenten Top-3:
  pmo-agent           156k tokens (10 calls)
  architecture-agent   94k tokens (3 calls)
  risk-agent           83k tokens (2 calls)
```
