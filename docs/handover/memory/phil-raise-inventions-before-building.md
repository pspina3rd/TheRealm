---
name: phil-raise-inventions-before-building
description: "Phil's standing rule on TheRealm — every invention of Claude's is raised with him individually before it is built, and the Trust and Verify loop is run before reporting"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 03fd32f7-b7de-5742-9e3e-0dc3a5d8df7d
  modified: 2026-10-09T02:34:11.466Z
---

On TheRealm, every invention of mine — a word in a customer's mouth, a
weight, a rule, a template, a field on a sheet — is raised with Phil
**individually, before it is built**, not listed afterwards in a report.
And the loops in `docs/trust-and-verify.md` and
`docs/trust-and-verify-cards.md` are run before anything is reported as
done, including the independent audit and reading the output as the
person on the other end of the call.

**Why:** Phil set this on 2026-09-10 ("you are in hand holding mode… any
and all inventions on your part are raised for review INDIVIDUALLY") and
restated it on 2026-10-03 as a standing rule. On 2026-10-08 I broke it:
asked to build the reply engine he had described (customer gets a
sentence template, picks words her character sheet variables recommend,
and the filled template is used to generate her response in her
character's voice), I instead kept the old engine's one stock line per
subject, put a chooser in front of it, invented about nine things without
raising them, skipped most of the loop, and showed him a data form as if
it were a conversation. His words: "everything you just said is not what
we discussed building."

**How to apply:** Before writing code, restate what he described in his
own terms and get a yes. List each thing I would have to make up and
raise them one at a time. Build the mechanism he described, not a
decoration of what already exists. Before showing output, read it as the
caller would. Related: [[phil-verify-by-reading-output]],
[[phil-teaches-by-register]], [[phil-change-only-what-was-asked]].
