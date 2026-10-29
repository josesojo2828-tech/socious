---
description: Write specifications (delta specs for changes)
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-spec` (skill tool: `sdd-spec`; file: `/home/jsojo/.claude/skills/sdd-spec/SKILL.md`) BEFORE starting.

Write the specification for a change.

- Read the proposal (required) from the backend: topic `sdd/<change-name>/proposal`.
- Delegate the writing to a fresh worker subagent with the resolved skill path and artifact references.
- Requirements are numbered and scenarios are concrete; quote the user's exact strings verbatim.
- Do NOT write implementation code in this phase.

Topic key: `sdd/<change-name>/spec`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-spec/SKILL.md` before starting.
