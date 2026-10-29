---
description: Break a change down into an implementation task checklist
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-tasks` (skill tool: `sdd-tasks`; file: `/home/jsojo/.claude/skills/sdd-tasks/SKILL.md`) BEFORE starting.

Produce the implementation task breakdown.

- Read proposal and design (both required) from the backend: topics `sdd/<change-name>/proposal` and
  `sdd/<change-name>/design`.
- Delegate to a fresh `sdd-worker` subagent with the resolved skill path and artifact references.
- Each task names the files it touches, the requirement it covers, and how it is verified.
- Do NOT implement the tasks in this phase.

Topic key: `sdd/<change-name>/tasks`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-tasks/SKILL.md` before starting.
