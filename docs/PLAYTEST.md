# Campaign playtest record

Automated campaign reports measure a bot policy. Browser integration checks use
explicit fixtures to check transitions. Use this record for a person playing a
fresh campaign without injected items, levels, flags, or battle outcomes.

## Setup

- Record the commit, hero class, browser, device, input method, and prior
  falling-block experience. Play keyboard and touch sessions separately.
- Start a new game. Record elapsed time, retries, level, equipment, and money at
  each gate. Note whether instructions made the next objective clear.
- Keep the same adventure between sessions. Save, reload, and confirm the hero,
  location, equipment, and completed objectives remain correct.

## Required progression

| Person or encounter | Location       | Goal                                                                       | Record                                                                   |
| ------------------- | -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Captain Vale        | Brightwater    | Clear blue and violet crystals to earn the Cave Pass                       | Actual requested counts, attitude, attempts, missing colors on each loss |
| Foreman Brann       | Redrock Quarry | Clear orange and violet crystals to open the ridge road                    | Actual requested counts, attempts, preparation before retry              |
| Apprentice Cinda    | Emberforge     | Clear red and orange crystals to earn the peak gate key                    | Actual requested counts, attempts, preparation before retry              |
| Moon Wyrm           | Moon Caves     | Win the combat, see the epilogue, and confirm the sequel ward stays sealed | Level, spells, gear, items, attempts, time, and route clarity            |

Record the counts shown in the game: Wary NPCs ask for more crystals. Crystal
trades require cleared crystals, so record whether a player understands that
placing a requested color alone does not count. A failed trade can be retried;
record whether that is apparent without outside explanation.

## Other flows

- Earn a shop visit, buy supplies, and sell an item; check the displayed price
  and remaining money. Revisit after leaving and negotiate again.
- Learn a spell from a mentor. Lose a lesson, observe its lock, retry, and win.
- Lose a monster fight; check the inn location, health recovery, and money loss.
- On touch, pause and resume both a trade and a fight. Check gesture accuracy,
  button reach, board size, and whether scrolling obscures the board.
- On keyboard, hold P once and check that it spends one pause. Navigate spell
  and item buttons while HP and mana change; focus should remain usable.

## Findings to return

For each blocker, record what the player tried, what they expected, what happened,
and whether retrying with preparation helped. Separate unclear instructions,
input mistakes, resource shortages, and difficulty. Include incomplete campaigns
and abandoned attempts when reporting completion rates.

Keep numerical balance changes separate from this observation record. Compare
multiple players and seeded bot reports before changing crystal targets, rewards,
recovery, or enemy strength.
