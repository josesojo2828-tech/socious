---
description: Start a new change: exploration then proposal
agent: gentle-orchestrator
subtask: true
---

This is a meta-command handled by you, the orchestrator. Do NOT invoke it as a skill.

Run the two phases in order, each as its own delegation to a fresh `sdd-worker` (or `sdd-explorer` for the explore phase):

1. `sdd-explore` — explore the topic and write `sdd/<change-name>/explore`.
2. `sdd-propose` — write `sdd/<change-name>/proposal` from that exploration.

Rules:
- Resolve each phase skill path once and pass the exact path to the subagent.
- The subagent reads its artifacts from the backend itself; pass references, not content.
- The subagent saves significant discoveries to Engram with `project: 'nutringest-arch'`.
- Stop after the proposal and report both artifact topic keys plus the open questions the proposal raised.
