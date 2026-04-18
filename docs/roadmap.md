# Release Strategy & Roadmap
## Poker Bet Tracker

---

## Strategic Framing

Poker Bet Tracker is built around a single north star: **# poker hands completed per active user without physical chips.**

The release strategy reflects this. Each release should expand what users can do in a hand — but only once the previous release has proven that the core loop is working. Complexity is earned, not assumed.

---

## Release Philosophy

> Build the simplest thing that lets people play. Validate that it works. Then add the next most valuable thing.

This means:
- MVP ships with intentionally limited poker logic
- Release 2 adds structure and guardrails once we know users are completing hands
- Backlog features are only prioritised once engagement depth is confirmed

---

## MVP — Core Tracking Loop

**Goal:** Let users play a hand without chips and trust the result.

**Unlock condition:** Proceed to Release 2 when:
- ≥ 75% of started hands are completed
- ≥ 60% of users play a second hand
- No widespread trust issues with pot/stack accuracy (qualitative)

### What's included

| Area | Features |
|---|---|
| Setup | Add player names and buy-in amounts |
| Gameplay visibility | Pot total, player stacks, player bets |
| Actions | Check, Bet (also covers call/raise), Fold |
| End hand | Select winner, award pot, reset for next hand |

### What's deliberately excluded
All betting rules enforcement, blind structures, turn order, side pots, and history. See `prd.md` for full out-of-scope list.

---

## Release 2 — Structure & Rules

**Goal:** Make the app feel more like real poker by adding turn awareness, betting streets, and rule guardrails.

**Trigger:** MVP success metrics met. Exit interview feedback pointing to friction around turn order and betting constraints.

### Candidates

| Area | Features |
|---|---|
| Configuration | Configure blind levels, max buy-in, max number of players |
| Gameplay support | Show player positions, show current betting street, show whose turn it is |
| Rules enforcement | Enforce minimum bet, constrain bets/raises to all-in when needed, prevent checking on existing wager, progress to next player, progress to next betting street |

### Prioritisation guidance
Start with **turn order and whose turn it is** — this is the most commonly raised gap in informal play and directly reduces game friction. Blind config and rules enforcement can follow.

---

## Backlog — Future Capabilities

These are validated ideas that are not yet prioritised. They should be revisited once Release 2 is stable and engagement metrics support further investment.

| Area | Ideas |
|---|---|
| Advanced pot logic | Side pot support, split pots, multi-way all-in handling |
| Game structure | Blind and button positioning, automatic blind rotation, seat positions |
| History | Betting history, player history, store past sessions |
| Multi-player | Multi-device support |
| Configuration | Templates, player photos |
| Rules | Raise-size enforcement (at least size of previous bet), all-in shortcut, enforce small blind / big blind |

---

## Roadmap at a Glance

```
NOW                  NEXT                 LATER
──────────────────   ──────────────────   ──────────────────────────
MVP                  Release 2            Backlog

Add players          Blind config         Side pots
Buy-ins              Max buy-in config    Blind rotation
Pot tracking         Max players          Seat positions
Stack tracking       Player positions     Betting history
Bet logging          Betting streets      Player history
Check / Bet / Fold   Turn progression     Past sessions
Award pot            Min bet enforcement  Multi-device
                     All-in constraints   Templates / photos
                     Check prevention     Raise-size enforcement
```

---

## Decision Checkpoints

### After MVP launch
Run 2–3 usability sessions (see `test-plan.md`). Review:
- Is the core loop completion rate ≥ 75%?
- Are users expressing any trust issues with the tracked state?
- What do exit interviews surface as the biggest missing piece?

### Before committing to Release 2
Confirm that the gap users are feeling is about **structure and rules** (turn order, blinds) rather than **interface clarity**. If it's the latter, fix the MVP before building on top of it.

### Before investing in backlog items
Validate engagement depth: are users averaging ≥ 3 hands per session? If not, more history and configuration features won't help — the core loop needs attention first.

---

## Out of Scope Permanently (for this product)

Poker Bet Tracker is not:
- A full poker simulator
- A tournament management tool
- A statistics platform
- A multi-table or online poker product

If feature requests push in these directions, evaluate whether they serve the original user (casual, in-person, no chips) or represent scope creep toward a different product entirely.
