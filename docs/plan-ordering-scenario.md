# Plan — the ordering scenario (POOF Instant Potion)

Phil's, this session, unless marked otherwise. Nothing here is settled by
being written here.

## 1. What the call is

An end user rings to order a **POOF Instant Potion**. Net new shipment.
Nothing has gone wrong. She calls it a refill, because that is what it is to
her; nothing of hers is topped up.

**The process:** ingredients are loaded into an appropriately sized flask per
the customer's request · the shipment is sent · the customer receives a
finished potion · empty flasks may be returned for a refund of the flask
deposit.

**So there is no hidden cause.** The engine's whole shape changes: success is
not finding something, it is an order correctly filled and a customer who
understands what she has bought.

## 2. The five ways it can be made up

1. **Standard** — fixed R&D recipe, same every time.
2. **Standard, on subscription** — the same recipe on a standing arrangement.
3. **Custom, TLC stock** — she chooses ingredients, paying for higher quality
   or additions to the recipe.
4. **Custom, her own Bag** — made from what is in her Bag of Holding.
5. **Custom, both** — her Bag plus our stock for the gaps.

Option 4 and 5 require a Bag with something in it. A villager who buys twice
a year has none; offering it is a wasted play and costs her confidence.

## 3. What has to be settled before it ships

| field | where it comes from |
|---|---|
| product | her — which potion |
| strength | her — and checkable against her order history |
| size | her — the flask is ours, sized to request |
| option | her, from the five, after we explain them |
| destination | her, and it must match the account |
| urgency | her — decides whether POOF is the right service at all |
| price | the record — POOF is priced separately from carriage |
| deposit | the record — on the flask, refunded on return of the empty |
| agreement | her — the last play |

## 4. What she can be wrong about

- **That it is a refill.** She expects her own flask topped up.
- **That POOF is simply faster.** It is experimental; outcomes vary.
- **What she last bought.** Checkable on the record.
- **Having a Bag.** She has none.

Correcting any of these is knowledge written to her sheet, and it stays.

## 5. Outcomes

- **Resolve** — the order is placed with its required fields filled.
- **Hold** — it cannot be completed today: stock, availability, or something
  that needs checking. Becomes a case with a callback.
- **Transfer** — it belongs elsewhere: a subscription is Subscriptions',
  a billing dispute is Billing's, and she can ask for someone else.

## 6. What carries to the next call

- Whether she was told it is not a refill.
- Whether she was warned that POOF's outcome varies.
- What she was quoted, and whether it matched.
- Her opinion, moving by how the call went.

An unwarned customer whose potion arrives odd rings back with our words in
her mouth. That is the loop this scenario exists to feed.

## 7. Acceptance criteria

1. No hidden cause, no reach words, no fix card. The engine runs on required
   fields, not on a departure from a baseline.
2. Every required field is filled either by asking her or by reading the
   record — and which one is enforced, not optional.
3. The five options exist, are presented to her, and offering a Bag option to
   a customer with no Bag costs a play and returns nothing.
4. Placing the order is refused while a required field is unfilled.
5. Three outcomes only: resolve, hold, transfer.
6. The warnings are optional, do not block the order, and are written to her
   sheet when given.
7. A second call can read what she was told on the first.
8. Nine plays, the opening free, and the existing card economy unchanged:
   two cards a turn, discard and draw, the hold, the aside.
