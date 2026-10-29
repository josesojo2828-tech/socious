---
description: Create the technical design with architecture decisions and approach
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-design` (skill tool: `sdd-design`; file: `/home/jsojo/.claude/skills/sdd-design/SKILL.md`) BEFORE starting.

Write the technical design for a change.

- Read the proposal (required) from the backend: topic `sdd/<change-name>/proposal`.
- Delegate to a fresh `sdd-worker` subagent with the resolved skill path and artifact references.
- Record every decision with the options considered and the tradeoff that decided it.
- Do NOT write implementation code in this phase.

Topic key: `sdd/<change-name>/design`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-design/SKILL.md` before starting.
