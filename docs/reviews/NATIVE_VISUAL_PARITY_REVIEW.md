# Native visual parity review

Independent review begun against the established web renderers on 2026-11-02.
The original checklist and findings are retained below. The implementation,
correction loop and Apple evidence are recorded in the delivery section.
Physical iPhone feel remains a device retest.

## Required comparison

The native application must carry the same authored visual language and cues.
Native layout can adapt to a phone while preserving the board, world and stage
meaning. Reusing an atlas alone does not establish this.

- Blocks: shared faceted gem faces, the seven element glyphs and exact palette;
  colorless blank material has no rune or mana implication. Preview and waiting
  pieces use the same block art. Ghost opacity stays readable.
- Obstructions: shared stone textures with strength-dependent brightness/cracks,
  durability pips, current required sides, remaining color marks, and a slow
  smooth sequence-color pulse. Use the actual sequence step, not its first item.
  Reduced Motion keeps the current requirement steady.
- Board goals: planting furrows and day/bed/path cues; build outlines and spare
  area; pipe target, protected mushroom, hazard/spore and ridge marks; dig lip;
  sealed-column lock/hatching/count and active timed/status badges. A generic
  rectangle does not substitute for these scenario-specific cues.
- Spell effects: all six base schools at all four ranks use the resolver's actual
  cell identities, origin, effect position and final position. Rank pips and row
  ticks show the tier/span. Changes occur locally on affected cells; unaffected
  material and the waiting piece remain visible. Ice grows blank material,
  Lightning visibly strikes/breaks, Nature converts to blank material, Wind
  moves actual blocks/obstructions, Gravity settles actual overhangs, and Fire
  burns actual removed blocks.
- Ordered Weaving: show each stage in order with its actual before/effect/final
  states and stage indicator; include a Fire→Gravity versus Gravity→Fire
  comparison and a mixed-rank example. Arcane opponent techniques remain
  character-targeted and distinct from custom Weaving.
- Battle stage/HUD: actual hero/opponent/helper art, readable HP and action
  progress, shared element icons/colors, rank/cost/ready cues, effect feedback
  and encounter purpose. No control crowding or silent change to gameplay.
- World: shared terrain/buildings and correct actor/strip/boss sizing; retained
  walking frames; authored inspection/attitude/mentor/lesson/seeking icons,
  passage labels/locks, destination waymarks, outcome prop swaps, stirring seals,
  faceted Sevenstones and a visible walking destination. Responsive framing must
  preserve touch-to-tile conversion and retained rendering.

## Initial findings sent to implementation

The original native renderer used different gem colors and simple beveled shapes,
solid-box previews, strength numbers and a single full obstruction border. Spell
feedback was decorative row bands without the resolver's cell trace. Native world
omitted authored meaning-bearing overlays and capped large bosses at 48 pixels.
The battle HUD omitted the web stage's opponent/hero/helper presentation and used
plain text/system-color mana progress. Board objective tags were generic shapes.
These are substantive missing visual elements, not platform requirements.

## Evidence required before approval

Source inspection and bridge tests must prove actual visual data is retained.
Asset export should use the web renderer directly and record source identity.
Apple compilation and representative iPhone screenshots/recording must then show
matching block/obstruction art, all school/rank effects, ordered Weaving and
character Arcane cues, readable HUD and authored world overlays. Include zero
spells and the actual opening path, not only a fully unlocked workshop.

Automated checks for accessibility-label existence alone are insufficient for
layout: the prior menu clipped visible prose while its label remained complete.
Review actual screenshots and visible geometry. Preserve the previous held-touch,
movement-flash, save, progression, page-skip and native input fixes.

## Implemented visual port and correction loop

The app now uses 86 exported PNGs from the actual web block, glyph, icon and
world-decoration renderers. Their manifest records source and image hashes;
`check:native-visuals` rejects stale or missing exports. Existing atlas sprites
remain the source for actors, terrain, buildings and creatures. The native layout
adapts to the phone; this is shared authored art and meaning, not a claim that
whole web and native screens have identical pixels.

Battle rendering now consumes the resolver's actual before/effect/final cell
traces, including unobstructed survivors, waiting pieces and ordered Weaving
stages. All six base schools have distinct four-rank visuals. Character-targeted
Arcane techniques remain separate from custom board Weaving. The compact stage,
shared textured previews and mana cues use real encounter data. Authored goal
marks and obstruction sequence steps are retained. World overlays, animated
outcome decorations, creature dimensions and responsive camera framing now
follow the web presentation.

Independent implementation reviews returned missing manual Arcane feedback,
board shake, mentor recoloring, cast beats, ordinary clear-flash suppression,
dynamic weakness/resistance data and incomplete authored-puzzle coverage. Those
findings were corrected. Root integration additionally corrected a Swift gallery
property that collided with UIResponder.next, retained unchanged board nodes,
kept the waiting piece above the traced cells and restored presentation timing.
The mentor review found incorrect forced elemental tint and an aura extending
past the stage; the correction and independent re-review are recorded in
[NATIVE_MENTOR_VISUAL_REVIEW.md](NATIVE_MENTOR_VISUAL_REVIEW.md).

## Apple evidence

The first complete [Apple run](https://github.com/pspina3rd/TheRealm/actions/runs/41562784650)
passed native compilation, engine/gesture checks and all nine iPhone 15 Pro UI
tests. It exported 110 visual cases plus the original campaign, book, map, menu
and gesture screenshots. Root inspected the actual native four-rank effect
contact sheet, representative obstruction, authored-goal, Arcane and ordered
Weaving cases, opening world and normalized web/native board comparisons. The
comparisons use actual web BoardView/drawAutoSpell rendering, not mockups.

The gallery is read-only and constructs detached real engine encounters. Tests
verify that it cannot replace the live battle, spellbook or save. Its visible
controls exist only in the DEBUG gallery, not in campaign gameplay. Touch input,
save identity/schema, story progression, sprite selection and tome behavior are
preserved. No WebView or extra gameplay action buttons were introduced.

The final mentor addition extends the gallery to 111 cases. Its authored Ember
Wisp tint and helper aura are verified in the fresh Apple capture described in
the mentor review. A negative Forge Imp fixture separately verifies that an untinted enemy
is not recolored merely because its mentor teaches Fire.

## Source checks and packaged project

[Repository CI](https://github.com/pspina3rd/TheRealm/actions/runs/41566012964)
passed formatting, lint, type checking, 1754 tests (25 optional skips) and the
production web build for candidate `28e74b9d4a267de48cffbfb7f2aec6d9078e7317`.
The native workflow verifies all 86 exported images and rebuilds the committed
offline JavaScript resource before Apple compilation.

`Crystals-iPhone-Visuals.zip` contains the complete Xcode project and sibling
`public/assets` directory: 185 committed files, including all 86 visual exports.
Every archived source/resource byte was compared with package revision
`1c7a536`; application source is unchanged from the validated candidate (the
additional commits contain review documentation and README changes only).
Archive SHA-256: `c3ed2fad37b69989ec51cdbeb933e21bcd4a58a43f3d24431685b2252bef4d72`.
The archive supplies a three-step START_HERE file. It is Xcode source for direct
installation, not a signed IPA or TestFlight upload. No npm/server is required
on the player's Mac or phone. Keep the existing installed app to retain saves.

## Final capture and scoped visual disposition

[Final candidate Apple attempt 1](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936/attempts/1)
compiled successfully, passed all 26 engine/gesture unit checks, the campaign UI
flow and all seven gallery tests, exporting all 111 visual cases. The actual
mentor screenshot shows authored Fire tint with preserved shading/transparency,
helper aura inside the stage, the shield cue and a real borrowed/helper piece.
Independent source and screenshot findings are recorded in the mentor review.

That first complete attempt was **not green**: the separate gesture UI test failed at
`app.launch()` with “Application ... does not have a process ID” before any board
inputs. The unchanged job was retried, and its launch diagnostics were examined; passing
visual cases alone were not reported as a fully passing run.

Independent inspection of the four-rank and special contact sheets and normalized
web/native Fire, Nature and Gravity pairs found no further visual blocker. One
bounded compositing difference remains: native Fire fades its affected gem faces
more strongly at the sampled midphase than the web canvas renderer. The shared
texture, affected cells and rank span agree. This is accepted as an opacity
variation, consistent with the scope excluding whole-screen pixel identity.

## Final validation complete

[Apple attempt 2](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936/attempts/2),
job `125695522058`, passed on the unchanged candidate: native compilation, all
26 engine/gesture unit checks and all nine iPhone 15 Pro UI tests, including the
previously unexecuted gesture/background-resume assertions and all 111 visual
cases. The original campaign flow also passed. No app behavior, test assertion
or timeout was changed between attempts.

The [diagnostic review](NATIVE_VISUAL_LAUNCH_RETRY.md) establishes the first
attempt's XCTest process-registration failure: the real battle app was alive
while the test runner tracked PID zero. The successful unchanged retry closes
the remaining simulator validation item. The scoped implementation, independent
correction/re-review and actual visual evidence are complete. The packaged
project is ready for physical iPhone retesting; no physical-device frame rate or
touch-feel claim is made from simulator evidence.
