---
description: Initialize Spec-Driven Development context for this project (stack, conventions, persistence backend)
agent: gentle-orchestrator
subtask: true
---

Load the skill `sdd-init` (skill tool: `sdd-init`; file: `/home/jsojo/.claude/skills/sdd-init/SKILL.md`) BEFORE starting.

Run the SDD init phase for this repository.

- Detect the stack and conventions from the real filesystem; the project guide is `AGENTS.md` and the
  structure reference is `ARCHITECTURE.md`.
- Bootstrap the active persistence backend (Engram, project `nutringest-arch`).
- Save the project context under topic `sdd-init/Nutringest_Arch`.
- Report the detected stack, the backend in use, and the conventions that were registered.

SKILL: Load `/home/jsojo/.claude/skills/sdd-init/SKILL.md` before starting.
