# Trust and Verify — the loop

A procedure for checking that work matches what was asked, before reporting
it as done. Written to be run, not admired. It exists because this project
has repeatedly been told something was true of the record or the code when
the speaker had not looked.

## The rule it enforces

**No claim about state without the output that proves it.** "It's in the
record", "the tests pass", "that's implemented" are not statements of fact
until a command has been run and its output shown. Memory of having done a
thing is not evidence that the thing is there.

## Run it in six passes

### 1. Enumerate the claim set
Write down, as a list, every discrete thing the work asserts. One line each,
each independently checkable. If an item can't be phrased as something a
command could confirm or refute, it isn't a claim — it's an impression, and
it gets struck or rewritten until it is one.

### 2. Evidence each claim, first-hand
For every item, run the command that proves or disproves it and keep the
output. Grep the file, run the suite, play the thing and read what it printed.
The evidence goes next to the claim; a claim with no evidence line is a
failure, not a pending item.

### 3. Check authority and attribution
For anything touching the record: does each statement carry the right tag —
**[P]** the owner's, **[C]** an unconfirmed inference, **[C·ok]** a confirmed
one, **[HELD]** raised and not settled? Is every cited line number the line
that actually says it? Is anything presented as settled that was never
approved? Attribution errors are the most expensive kind here, because they
turn a guess into an authority.

### 4. Hunt the inverse
For each claim, ask what would have to be true for it to be false, and test
*that*. A passing test proves the path it walks; it says nothing about the
path beside it. Specifically: does the thing work when the input is absent,
duplicated, out of order, or supplied by the wrong side? Were the numbers
measured after the last change, or before it?

### 5. Independent audit
Hand the work and the authority to a reader who did not do it, with explicit
instructions to report contradictions, inventions and unimplemented rules, to
cite file and line for both sides, and to offer no fixes or opinions. Then
verify a sample of what comes back first-hand — an auditor can be wrong, and
accepting its findings uncritically is the same failure one step removed.

### 6. Correct, then re-run from pass 1
Every correction invalidates the evidence gathered before it. Re-run the
passes rather than patching the report: numbers measured before a fix are
false after it, and a commit message carrying them is a false record.

## Finishing

Report three things, in this order: what was verified and by what evidence;
what was found wrong and what was done about it; and what remains unverified
or unbuilt, named plainly. A report with no third section is almost always
incomplete rather than perfect.

## The failure modes this is written against

- Reporting from memory instead of from the file.
- Treating a green suite as proof that the thing works.
- Writing design into commit messages and then describing the record as
  containing it.
- Measuring, changing the thing, and reporting the old measurement.
- Grading one's own work from a single perspective and calling it finished.
- Accepting a delegated report without checking any of it.
