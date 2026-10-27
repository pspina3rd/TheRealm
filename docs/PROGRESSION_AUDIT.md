# Progression audit on the team's story branch

These results cover the currently implemented first half, ending at the Moon
Wyrm. They do not measure full-campaign completion. The approved full story
continues through Boss 2, Vesper, Boss 3, Fennick's rite, and Vesper's final
form; see [STORY_ARC.md](STORY_ARC.md). Historical report fields named
`completedChapters` refer only to the Wyrm chapter endpoint.

## Baseline and decisions

These results use `claude/laughing-brown-7i13lb` at `b3e4b90`, with the
economy, storage, and control fixes integrated. The authored script, version-8
story saves, Sevenstones, Wyrm visions, dialog fixes, and team balance values
are retained. Sunken Ruins remains an intentionally sealed sequel hook.
Version-7 GetPutTaco saves inside its removed Sunken Ruins map relocate to
the overworld ward approach with their hero and progress intact. Version-8
story migration, dialogue memory, and pending visions remain supported.
Earlier reports from the older GetPutTaco data are superseded; their counts
are not a controlled comparison with this run.

All three preboss gates are crystal trades. The old bot used combat scoring
that penalized singles, ignored requested colors, attempted gates early in
map-data order, and never returned after failing. In ten isolated Ranger
trials on the earlier data, a greedy-clear strategy improved Vale from
1/10 to 5/10 and Brann from 4/10 to 8/10. This justified correcting the bot
before changing production crystal targets.

The revised policy uses challenge-specific objectives, bounded retries,
earned investments, paid recovery, and fresh shop negotiations. Individual
attempt traces distinguish missing requested crystals, actual defeats,
closed gates, and simulation stops. These changes affect test helpers, not
production combat or gate requirements.

## Five-seed results

The report ran seeds 1–5 for each class at both input speeds: 40 campaigns.
Counts are reproducible bot observations, not estimates of human win rates.

| Class  | Wyrm victories at 1500 ms | Wyrm victories at 2200 ms | Touch runs reaching the battle deadline |
| ------ | ------------------------- | ------------------------- | --------------------------------------- |
| Ranger | 5/5                       | 1/5                       | 2                                       |
| Knight | 4/5                       | 0/5                       | 2                                       |
| Mage   | 3/5                       | 0/5                       | 2                                       |
| Rogue  | 5/5                       | 0/5                       | 3                                       |
| Total  | 17/20                     | 1/20                      | 9                                       |

Every keyboard campaign earned all three gate flags, and none timed out.
Across both speeds, Vale's flag was earned in 40/40 runs, Brann's in 36/40,
and Cinda's in 35/40. These are campaign flag counts, not conditional NPC
win rates: some campaigns stopped before later gates. No puzzle solver
budget was exhausted. All 18 Wyrm victories retained the sealed sequel.

The nine touch deadlines include one optional mentor lesson after an earned
Wyrm victory. That victory is still counted. Eight touch runs were censored
before victory: encounters included the grove troll/sprout, cave monsters,
and mentor lessons. Treating every deadline as a defeat would overstate the
evidence. The remaining losses may reflect combat strategy, preparation,
route assumptions, or difficulty; these results alone cannot separate them.

## Next evidence and limits

No production balance numbers were changed in this audit. Investigate the
touch encounters named in the traces before retuning the Wyrm or global
crystal requirements. Compare longer deadlines and alternative legal spell,
equipment, and retry policies without silently changing the reported model.

Browser checks use explicit fixtures for lifecycle and UI behavior. They
do not demonstrate an earned campaign. A person still needs to complete
keyboard and touch sessions using [the playtest record](PLAYTEST.md), noting
objective clarity, real retry behavior, fatigue, and resource shortages.

Reproduce the full report with:

```bash
RUNS=5 SIM_OUT=/tmp/campaign.md npm run sim:progression
```

The report writes a readable summary and region table, a compact summary JSON,
and a detailed trace JSON alongside it. Passing the report command means
the instrumentation ran successfully; it does not mean every campaign won.
