# Claim set — her side of the bag call, in the engine

Written 18 October, before any code (step 2 of the three agreed with Phil).
What the engine has to do so that a played call reads like the hand-played
runs in `docs/playthroughs-16-oct.md` and `docs/playthroughs-18-oct.md`. Each
claim is tagged and cited. **[C]** lines are mine and are to be ruled on by
Phil before they are built. Nothing here is folded into the record.

## Already decided

1. **[P]** A word reaches the player only after she or the record has said
   it. (`settled.md` §2, *The turn, and her side of it*)
2. **[P]** The player makes one or two inquiries a turn; she answers neither,
   the first, the second, or both, and chooses from her sheet. (§2)
3. **[P, tentative]** She has the same six cards and picks which one she
   answers from; it need not be the one asked. All six work for any target.
   Her side is single words; the hand of five is the player's, and her side
   has no limit. (§2, *Her side, mirrored*)
4. **[P]** Neither is the random option: a quasi-related aside that brings
   something new in — her life, her world. (§2; §8, *What the random option
   brings in*)
5. **[P]** What she knows on this call is Phil's list of 16 October
   (`docs/notes-reply-engine.md`, top), and what she believes can be wrong.
   (§8, *It misremembers*; Phil, 18 October)
6. **[P]** Her sheet's fields are tolerance for repetition, empathy, pattern
   sensitivity, tolerance for non-positive outcomes, each low/middle/high
   over a continuous value, and depth or breadth as a starting lean that
   moves with the call. (§8, *Fields*)
7. **[P, 18 October]** Her baggage is one of three — *set it up herself*,
   *no one told her*, *Pell gets hurt* — with the lines, triggers and
   leanings in `src/cards/bag.js`. A trigger can fire obliquely. (§8, *Wards,
   and the trigger for a Need*)
8. **[P, 18 October]** Request: she can't transfer the draught to Pell's
   bag. Need: Pell has the draught on him before he leaves in the morning.
   Reopening the bag, assigning the draught, or both can meet it. (§6,
   *Request and Need*)
9. **[P, 16 October]** Three causes, which can stack: `her-word`; her own
   setting, changed last night; the system update, three days ago. Her
   profile shows the setting and when it changed, not who. Bram knows about
   the update. (`docs/plan-two-causes.md`)
10. **[P]** A Transfer card exists once she asks for someone else.
    (`docs/spec-call-engine.md` §5)
11. **[P]** Her words are a filled template treated as a prompt; the
    templates are to be developed from play-throughs. (§8, *Her words*;
    *Remembrances and lenses*)

## Mine, to be ruled on

12. **[C] Patience goes.** The engine reads the five record fields instead.
    Patience is in `src/cards/sheet.js`, `reply.js` and `turn.js`, and is
    mine. *What it touches:* how often she answers both, how much she says,
    and when her memories come up.
13. **[C] What each band does**, read off the record's own wording and seen
    in runs 6–10:
    - Repetition *high*: says the fix back, wants it settled in words.
      *Low*: a question she has already answered makes her say less.
    - Pattern *high*: after the same card on the same word three times, or
      two cards alternating, she names it. *Middle*: only the straight run.
    - Empathy *low*: no warmth either way. *High*: an apprentice's miss is
      put on the company, not the agent.
    - Non-positive *low*: after two wrong remedies she asks for someone else.
      *High*: her lines stop changing with the call, so the player loses the
      read.
    - Casting *wide*: a third inquiry on one word makes her say less; a new
      word brings her back. *Digging*: a change of word before the last one
      is answered makes her say less.
14. *Withdrawn 18 October* — how her lines are made. Phil: *"Did I say to do
    that yet?"* Not for this step.
15. *Withdrawn 18 October* — acceptance against the hand runs. Phil: *"Did I
    say we were here yet?"* That is step 3, not step 2.

## Phil's rulings, 18 October

- 13: **OK.**
- 12: **"Delete it for now."** Patience goes when the engine is built; the
  code is not touched until then.
- 14 and 15 come back **after the test has been run properly and fully, and
  her responses are consistent and customer-specific** (Phil).

## How she shares information — accepted by Phil, 14 November

The five counts are Phil's, from the design frame
(`docs/handover/memory/therealm-design-frame.md`): volume, signal,
certainty, accuracy, openness. The meanings and Sella's ranges are mine
**[C·ok]**. Each is where she usually sits and how far she strays, fitted
to her and to this call, not a general scale. Not folded into the record.

16. **Volume — how much she says per answer.** Usually a sentence or two
    that answers what was asked. On her own point (the bag, Pell) she can
    run to three or four. After a repeat or a change of subject she drops
    to a few words. She rarely opens with the whole story unasked.
17. **Signal — how much of it helps solve the problem.** Usually high: she
    stays on the bag and Pell. Stress adds some noise, such as how long she
    has been at it and how many times she tried. It rarely crowds out the
    useful part.
18. **Certainty — how sure she sounds.** High and steady on what she has
    seen: the draught is in the bag, Pell can't get in, he leaves in the
    morning. Low on why, and she says so plainly. The narrowest range of
    the five.
19. **Accuracy — how right she is.** Usually right about what she sees.
    Reliably wrong about two things without knowing it: what the action is
    called, and that nothing changed on her side. Now and then she words
    something loosely enough to mislead; that is rare.
20. **Openness — how willingly she shares beyond the problem.** Middling.
    She answers about Pell and the contract when asked, and does not offer
    her own worry. That comes out only when something sets it off.

### How the five work — Phil, 14 November

21. **[P]** Customers respond to a given inquiry according to a bell curve.
    A customer has her own bell curve of potential responses along that
    same spectrum. His example: the number of ways to greet someone in
    English.
22. **[P]** That holds for each of the five, and they can impact and
    influence one another.
23. **[C·ok]** How 22 sits with the design frame's "independent": the five
    are rolled separately on her sheet, so knowing one tells you nothing
    about another. During a call, a draw on one can shift where another
    lands. Phil: *"That is right."*
24. **[C]** So one answer from her is five linked draws from her own
    curves, and a run should be drawn that way. Most answers land near her
    usual; a tail is rare, and takes others with it. The examples of which
    one pulls on which (volume on signal, openness on volume, certainty on
    how accuracy is heard) are mine and not ruled on.
