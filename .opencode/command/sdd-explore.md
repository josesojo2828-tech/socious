---
description: Explore and investigate an idea before committing to a change
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-explore` (skill tool: `sdd-explore`; file: `/home/jsojo/.claude/skills/sdd-explore/SKILL.md`) BEFORE starting.

Explore the topic and produce the exploration artifact.

- Read context from the backend yourself (topic key below, or the change name given by the user).
- Delegate the read-only investigation to a fresh `sdd-explorer` subagent. Pass the resolved skill path and
  the artifact references (topic keys or file paths) — NOT the artifact content.
- The subagent writes the artifact to the backend and saves discoveries to Engram.
- Do NOT write implementation code in this phase.

Topic key: `sdd/<change-name>/explore` (project `nutringest-arch`).

SKILL: Load `/home/jsojo/.claude/skills/sdd-explore/SKILL.md` before starting.
