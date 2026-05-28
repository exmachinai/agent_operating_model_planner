# Evaluation Suite — github-pat-mcp-server

## Purpose

Tests whether an LLM can effectively use this MCP server to answer realistic questions about the AEGIRA project's GitHub presence at `github.com/exmachinai`.

Methodology follows the **anthropic-skills/mcp-builder** evaluation guide and the AEGIRA `docs/04_agent-best-practices.md` §10 (Evaluation-Pflichten).

## Files

- `evaluations.xml` — 10 read-only question/answer pairs.
- `run_eval.md` — how to execute (manual + automated path).

## Running the eval

Manual run with Claude Code:

```bash
# 1. Build the server
cd ../  # mcp/github-pat-mcp-server
npm install && npm run build

# 2. Verify connection
export GITHUB_TOKEN=ghp_your_token
node dist/index.js &   # in background, or wire as MCP-server in your client

# 3. In Claude Code (or any MCP-aware client):
#    Load this MCP, then run each question and compare answer with the XML expected value.
```

Automated run (planned for Phase 4):

```bash
node tools/run_eval.js evaluations.xml
```

(Runner is part of Phase 4 deliverables — manual run is the v1.0 baseline.)

## Scoring rubric (LLM-as-judge — single call, single prompt)

Per Anthropic Multi-Agent-Research-System guidance:

| Dimension | 0.0–1.0 |
|---|---|
| Factual accuracy | claims match GitHub API |
| Citation accuracy | tool calls reference correct resources |
| Completeness | all parts of the question answered |
| Source quality | primary GitHub API used, not external scraping |
| Tool efficiency | reasonable number of tool calls (< 6 for these questions) |

PASS = average ≥ 0.85 AND no individual dimension < 0.70.

## Why these questions

The 10 questions reflect actual workflows the planner-agents will perform:

- **#1, #2, #3:** Repo-discovery — used by PMO-Agent during initial setup.
- **#4, #6, #7:** Repo-introspection — used by Architecture-Agent when mapping infrastructure.
- **#5, #9, #10:** Cross-repo analytics — used by Reviewer-Agent for portfolio-level checks.
- **#8:** Feature-detection — used by Skill-Mapping-Agent to determine deployment options.

## Stability note

Answers are stable as long as `exmachinai` user-account state does not change. If new repos are added or existing ones modified, regenerate the XML by running:

```bash
# Pull current state into a fixture
node dist/index.js < tools/snapshot.jsonl > eval/exmachinai_snapshot_$(date +%F).json
```

…and re-derive answers from the snapshot.
