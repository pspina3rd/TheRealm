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
- 12: asked what it means — explained in plain words, not yet ruled.
