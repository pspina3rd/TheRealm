---
name: phil-trust-and-verify-means
description: "Phil's own seven-line definition of Trust and Verify, given 10 Oct 2026 after Claude skipped the loop twice in one session; the loop includes fixing and following consequences, not only checking."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4268d6bb-1f62-5aa7-b69f-0a0d1d8014ea
  modified: 2026-10-11T08:24:18.301Z
---

Phil's words, 10 October 2026, verbatim:

- Trust and verify is checking your work.
- Trust and verify is fixing the problems.
- Trust and verify is checking your work again.
- Trust and verify is checking up and downstream impacts.
- Trust and verify is confirming the obvious is addressed.
- Trust and verify is counting on the unexpected.
- Trust and verify is making the leaps of logic.

**Why:** In one session on TheRealm Claude (a) built before reading `docs/trust-and-verify.md`, reproducing two faults the working notes already described; (b) graded its own output as "lands" when it did not; (c) reported a correct rule as "failed" because scripted agents written for the old behaviour scored worse, and then undid the rule; (d) found a broken downstream thing and asked Phil whether to fix it instead of fixing it; (e) fixed a fault as a special case and left its cause, so the next removal produced the same fault again.

**How to apply** (the reading below is Claude's, not Phil's):
- Run it before reporting, and before building: write the claim as something a command can refute, and check the notes and the record for the fault you are about to rebuild.
- A problem found during the check gets fixed, then everything is checked again. Don't hand Phil a found problem as a question when the fix follows from what he has already ruled.
- Before changing a rule, find what depends on it (callers, scripted agents, other scripts, docs) and what it depends on. After, look for what the change broke elsewhere.
- Fix the cause, not the instance. If one thing is wrong for a reason, find everything else wrong for the same reason (the "leap of logic").
- The last commit is a starting point, not the target. "Matches the old results" is not evidence of anything; Phil said so directly the same day.
- This does not override [[phil-raise-inventions-before-building]]: new lines, numbers and rules of Claude's are still raised first. Removing or correcting Claude's own earlier inventions is fixing.

Related: [[phil-verify-by-reading-output]], [[phil-record-details-report-problems]].
