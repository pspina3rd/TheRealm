# Native visual parity review

Independent review begun against the established web renderers on 2026-11-02.
This is an acceptance checklist and initial audit, not an approval or a claim of
physical iPhone validation. Implementation and Apple evidence remain pending.

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
