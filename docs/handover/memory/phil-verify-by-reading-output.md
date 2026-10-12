---
name: phil-verify-by-reading-output
description: On TheRealm, green tests never mean "it works" — read the generated content before reporting anything
metadata:
  type: feedback
---

On TheRealm, never report "it works" on the strength of passing tests,
clean lint, or the app booting. Print the actual generated dialogue and
read it end to end first.

**Why:** A previous session repeatedly reported "142 tests pass, lint
clean" while Phil could break the fiction in one playthrough. His words:
"stop gaslighting me and do competent and professional level work."
Every time output was actually printed and read, it exposed real bugs
in seconds. The tests verify that it *runs*, never that a conversation
makes sense.

**How to apply:** Before any claim of completion, generate several full
calls and read them as a player would. Audit authored content
exhaustively where it's cheap to do so (enumerating all 289
action-lines found that 68% were generic fallbacks contradicting the
live root cause). Bring findings as a list rather than patching
line-by-line as Phil hits them. Related:
[[therealm-lore-inflation]], [[call-center-not-front-desk]].
