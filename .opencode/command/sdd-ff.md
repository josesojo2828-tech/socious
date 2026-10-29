---
description: Fast-forward a change: proposal, spec, design and tasks in one run
agent: gentle-orchestrator
subtask: true
---

This is a meta-command handled by you, the orchestrator. Do NOT invoke it as a skill.

Run the four planning phases in order, each as its own delegation, for the requested change:

1. `sdd-propose` -> `sdd/<change-name>/proposal`
2. `sdd-spec` -> `sdd/<change-name>/spec`
3. `sdd-design` -> `sdd/<change-name>/design`
4. `sdd-tasks` -> `sdd/<change-name>/tasks`

Rules:
- Each phase reads its required predecessors from the backend by topic key.
- Resolve every phase skill path once and pass the exact path to the subagent.
- The subagent saves significant discoveries to Engram with `project: 'nutringest-arch'`.
- Stop after the tasks artifact. Do NOT implement.

Report the four artifacts produced and the decisions that still need the user.
