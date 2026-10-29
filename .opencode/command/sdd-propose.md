---
description: Create or update a change proposal (intent, scope, approach)
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-propose` (skill tool: `sdd-propose`; file: `/home/jsojo/.claude/skills/sdd-propose/SKILL.md`) BEFORE starting.

Create or update the proposal for a change.

- Read the exploration artifact from the backend (topic `sdd/<change-name>/explore`) when it exists.
- Delegate the writing to a fresh `sdd-worker` subagent; pass the resolved skill path and artifact references.
- The subagent writes the proposal to the backend and saves significant discoveries to Engram.
- Do NOT write implementation code in this phase.

Topic key: `sdd/<change-name>/proposal`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-propose/SKILL.md` before starting.
