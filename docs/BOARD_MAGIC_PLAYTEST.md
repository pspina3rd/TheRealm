# Board magic workshop

Use branch **GetPutTaco**, Node.js 22.12+ and the normal development server:

```sh
npm install
npm run dev
```

Open **http://localhost:5173/workshop.html** (use the port Vite prints if different).
This is a development-only playable review fixture, not part of the static release.
Your adventure save is untouched; workshop progress uses a separate save namespace.

- Arrow keys move; Up rotates; Space drops. The on-screen controls work on phones.
- Select an elemental spell and practice rank, then preview it. Tap a preview row
  or use the target slider. Wind also has left/right direction. Confirm spends
  mana; Cancel spends nothing. Before/After are the actual deterministic results.
- Obstruction brightness and pips show strength. Colored edges show the next
  required contact; the small sequence marks show subsequent colors. A matching
  neighbor advances one step, not every frame. Ice/converted blocks are blank and
  contribute no mana.
- Open **Arcane upgrades** to create a pairing, then spend the displayed skill
  points to raise it. Select the pairing and preview its cast. Practice bases
  begin developed; this does not establish campaign affordability.
- The opponent places obstructions on its own action clock. Arcane Gravity lasts
  for its placements, not yours. The ally adds a neutral block every 12 seconds.
- Reset restores the board and practice supplies; Refill restores practice mana.
  Purchased pair ranks remain in the workshop save.

Review whether targeting and color requirements are clear, previews match results,
strength/anchoring are readable, interference feels fair, and phone controls work.
Campaign-wide activation and numerical retuning follow this review. Existing M1
acceptance remains a separate playtest.

## Verified checkpoint

The implementation has 1,127 passing tests (17 optional/report cases skipped),
and passes format, lint, typecheck and the production build. The workshop and
original M1 browser checks pass at 360x640, 390x844 and 1100x900 with no page
errors or horizontal overflow. These are automated fixtures, not author
acceptance or campaign-wide balance measurements.

[Workshop browser report](artifacts/board-magic/workshop-report.json),
[M1 regression report](artifacts/board-magic/m1-regression-report.json),
[phone workshop capture](artifacts/board-magic/phone-workshop.png) and
[desktop preview capture](artifacts/board-magic/desktop-preview.png) are saved.

The rollout flag additionally enables selected Slime/Goblin interference variants
and usable board-spell targets in mentor lessons. It is not set on adventure
saves until this review. Boss signature moves are not replaced by those variants.
Legacy row-sweep spells cannot bypass durable obstructions; Purify affects loose
stone rather than owned obstructions. Targeted Lightning/Nature provide the new
routes through owned obstacles.
