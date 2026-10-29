---
description: Create the next missing artifact in the dependency chain
agent: gentle-orchestrator
subtask: true
---

This is a meta-command handled by you, the orchestrator. Do NOT invoke it as a skill.

Determine the next missing artifact in the dependency chain for the requested change and produce only that one:

```
proposal -> specs --> tasks -> apply -> verify -> archive
             ^
             |
           design
```

- Check which topic keys already exist for the change under `sdd/<change-name>/`.
- Produce exactly the next missing artifact, delegating that single phase to a fresh `sdd-worker` (or `sdd-explorer` for the explore phase) with its skill path.
- Stop after it. Do not run the next phase in the same turn.

Report the artifact produced, its topic key, and the next phase in the chain.
