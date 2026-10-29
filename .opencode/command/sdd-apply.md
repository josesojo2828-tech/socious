---
description: Implement tasks from a change, writing real code that follows the specs and design
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-apply` (skill tool: `sdd-apply`; file: `/home/jsojo/.claude/skills/sdd-apply/SKILL.md`) BEFORE starting.

Implement tasks from the change.

- Read tasks (required), spec (required) and design (required) from the backend:
  topics `sdd/<change-name>/tasks`, `sdd/<change-name>/spec`, `sdd/<change-name>/design`.
- Delegate to a fresh `sdd-worker` subagent with the resolved skill path and artifact references.
- Apply the project test-first policy: observe RED before the fix, implement GREEN, then refactor.
- Never build. Typecheck and test only. Baseline debt is documented in `AGENTS.md`.
- Report which tasks were applied and the observed test output. Do NOT commit unless the user asks.

Topic key for progress: `sdd/<change-name>/apply-progress`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-apply/SKILL.md` before starting.
