# Trust and Verify — the card work

Run this when working on the suits, the targets or the upgrades. It inherits
`trust-and-verify.md` and adds what is specific to cards: a deck can be
plausible on paper and still be a lottery, a tax, or a solved puzzle, and
none of those show up in a passing test.

## Before any code

**1. Name the claim set, as the design.** Every rule the card system asserts,
one line each, each phrased so a command could refute it. "Six suits" is not
a claim. "A suit plays against a target drawn from what is in play, and a
suit with no available target cannot be dealt" is.

**2. Separate his from mine, line by line.** For every rule: is it Phil's, an
inference he confirmed, or mine? Mine get raised individually before they
reach code, and they are marked in the plan so the next reader can tell.
A rule that cannot be traced to one of those three does not get built.

**3. Check it against the settled card rules before writing anything.** The
record already fixes: nine plays with the opening free · what consumes one ·
two cards a turn, discard and draw · Armour, Strength and Finesse as the
three upgrade categories, up to three of the same or two with one doubled ·
Finesse sitting on the card it is attached to · the last-three-turns check on
both the door and the subject · a find held as a card · the aside. Any new
structure either fits those or replaces one of them, and replacing one is a
change to a [P] statement that needs saying out loud.

## While building

**4. Evidence first-hand, as always.** No claim about what the deck does
without the output. Deal it a few hundred times and print the distribution,
not a summary of your intentions.

**5. The four deck pathologies.** Each needs its own measurement, because a
deck can pass the others and fail this one:

- **Lottery** — the card that matters arrives by luck rather than by play.
  Measure: how often is the useful card in hand when it is needed, and does
  that rate move with skill at all?
- **Tax** — cards that are always dead. Measure: plays per card type against
  payouts per card type, and name any type that never pays.
- **Solved** — one sequence is always right. Measure: across many runs, does
  the best line vary with the customer and the situation, or is it fixed?
- **Flat** — the choice does not matter. Measure: outcomes when a competent
  policy chooses well against the same policy choosing at random. If the gap
  is small, the decision is decoration.

**6. Read the transcripts.** Print calls and read what the customer says and
what the hand offered. Every real fault in this engine was found this way and
none by the suite. Specifically look for: the same word with a flavour on it
filling a hand; a card that cannot be played against anything; two cards in
one turn producing one answer; and a hand that makes the correct play obvious.

**7. Hunt the inverse.** For each upgrade: what does it take away? An upgrade
that only adds is a strictly better card, and a deck of those has no
decisions in it. For each suit: what call cannot be answered with it, and is
there a customer for whom it is the wrong register?

## Before reporting

**8. Independent audit** of the built thing against the record and the plan,
asking for contradictions, inventions and unimplemented rules with file and
line for both sides. Then verify a sample of its findings first-hand: the last
audit was wrong about one claim in four.

**9. Measure after the last change, not before it.** Every tuning pass
invalidates the numbers. A report or a commit message carrying stale figures
is a false record.

**10. Report three things:** what was verified and by what evidence; what was
found wrong and what was done; and what remains unbuilt or unmeasured, named
plainly.
