---
description: Validate that the implementation matches specs, design and tasks
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-verify` (skill tool: `sdd-verify`; file: `/home/jsojo/.claude/skills/sdd-verify/SKILL.md`) BEFORE starting.

Verify the change with real execution.

- Read tasks (required) and spec (required) from the backend: topics `sdd/<change-name>/tasks` and
  `sdd/<change-name>/spec`, plus the design when it exists.
- Delegate to a fresh `sdd-worker` subagent with the resolved skill path and artifact references.
- Re-run the tests and the typecheck. Compare against the baseline debt in `AGENTS.md` before
  attributing any failure to the change.
- Map every scenario to a passing test and flag deviations and deferred items explicitly.
- Report a verdict with evidence per requirement.

Topic key: `sdd/<change-name>/verify-report`.

SKILL: Load `/home/jsojo/.claude/skills/sdd-verify/SKILL.md` before starting.
