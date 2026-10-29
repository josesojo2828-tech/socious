---
description: Sync delta specs to main specs and archive a completed change
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-archive` (skill tool: `sdd-archive`; file: `/home/jsojo/.claude/skills/sdd-archive/SKILL.md`) BEFORE starting.

Archive the change.

- Read every artifact of the change from the backend: topics `sdd/<change-name>/{explore,proposal,spec,design,tasks,verify-report}`.
- Only archive a change whose verification report exists and whose verdict is acceptable.
- Delegate to a fresh `sdd-worker` subagent with the resolved skill path and artifact references.
- Do NOT change product code in this phase.

Topic key: `sdd/<change-name>/archive-report`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-archive/SKILL.md` before starting.
