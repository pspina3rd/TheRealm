---
name: therealm-lore-inflation
description: "TheRealm's core risk is designed-but-unbuilt systems piling up; it now applies to docs/settled.md"
metadata:
  node_type: memory
  type: project
  originSessionId: 7bd4ac8e-384b-555b-b23f-407f38dacc79
  modified: 2026-09-26T21:52:28.418Z
---

TheRealm's recurring problem is the ratio of design to build, not
missing features. By 2026-09-08 `LORE.md` had grown to ~2,900 lines,
most of it describing systems with no code at all. It was archived on
2026-09-26 (now a pointer to `archive/`), so its specifics no longer
matter.

**Why:** Adding a fully-designed, fully-unbuilt system on top of another
one is the failure mode that produced that state.

**How to apply:** The same risk now applies to `docs/settled.md`, which
grows with every session. Prefer replacing text there over adding it,
and verify any claim that something is built against the code before
trusting it. Related: [[therealm-design-frame]],
[[phil-verify-by-reading-output]].
