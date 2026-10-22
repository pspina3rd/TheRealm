# Stage 6 progress (temporary)

Plan: types (NpcDef element/lines/bonus/secret/essential/inanimate) → src/game/attitude.ts →
npcs.ts rewrite → shops (no tomes, secretStock) → encounter/shop wiring (price = list × haggle × attitude;
Charm folds into attitude, per-rank discount removed) → UI faces (icons, map, conversation, shop) →
tests → docs → browser QA (port 4176).

Thresholds: Devoted ≥ 6, Friendly ≥ 3, Neutral ≥ −½, Wary ≥ −2½, Hostile below.

- [x] types, attitude.ts, npcs, items, shops, encounter, shop, UI (faces map/conversation/shop, accept line banner)
- [ ] fix old tests, new tests, docs, browser QA
