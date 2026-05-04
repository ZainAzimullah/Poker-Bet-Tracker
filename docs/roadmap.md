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
- Any correctness or high-friction issues found post-MVP are patched before Release 2
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

### MVP status
MVP success metrics have been met. See `findings-and-recommendations.md` for the full post-MVP review. A patch is shipping before Release 2 to address a correctness issue and two high-friction gaps surfaced by that review.

---

## Immediate Patch — Correctness & High-Friction Fixes

**Goal:** Fix a tracked-state correctness issue and two friction points that emerged from post-MVP user feedback before building on top of the MVP.

**What's included**

| Area | Work |
|---|---|
| Bet input UX | Fix additive bet input labelling — display current maximum wager and label the field *Amount to add* so users enter the increment, not the total wager |
| Actions | Add a one-touch Call button that auto-calculates the difference between the current maximum bet and the acting player's current bet |
| Position display | Add dealer / SB / BB role display with a rotate button at end of hand (display only — no enforcement or configuration) |

**Why now, not Release 2**

The bet input issue is a correctness problem: users entering the total wager instead of the increment get a wrong pot total, which is the opposite of what the product exists to provide. It caused at least one mid-session restart in post-MVP testing. The call button and position display address the two most consistently cited friction points in user feedback and are self-contained additions that do not require Release 2 infrastructure.

---

## Release 2 — Structure & Rules

**Goal:** Make the app feel more like real poker by adding turn awareness, betting streets, and rule guardrails.

**Trigger:** Immediate patch shipped. Continued feedback pointing to friction around turn order and betting constraints.

### Candidates

| Area | Features |
|---|---|
| Configuration | Configure blind levels, max buy-in, max number of players |
| Gameplay support | Show player positions, show current betting street, show whose turn it is |
| Blind posting | Automatic deduction of SB and BB from player stacks at the start of each hand |
| Rules enforcement | Enforce minimum bet, constrain bets/raises to all-in when needed, prevent checking on existing wager, progress to next player, progress to next betting street |
| End hand | Split pot — equal division when both players hold equivalent winning hands |

**Note on split pot vs side pots:** Split pot (equal division of the main pot between tied players) is a correctness gap — it can arise in any heads-up game and cannot currently be resolved within the app. Side pots (created when players go all-in with different stack depths in multi-way hands) are a separate, more complex problem and remain in the backlog.

### Prioritisation guidance
Start with **turn order and whose turn it is** — this is the most commonly raised gap in informal play and directly reduces game friction. Blind level configuration and automatic blind posting follow (blind config must ship before posting, since posting depends on knowing the configured amounts). Rules enforcement (min bet, check prevention, all-in constraints) comes last.

---

## Backlog — Future Capabilities

These are validated ideas that are not yet prioritised. They should be revisited once Release 2 is stable and engagement metrics support further investment.

| Area | Ideas |
|---|---|
| Advanced pot logic | Side pot support, multi-way all-in handling |
| Game structure | Blind and button positioning, automatic blind rotation, seat positions |
| History | Betting history, player history, store past sessions |
| Multi-player | Multi-device support |
| Configuration | Templates, player photos |
| Rules | Raise-size enforcement (at least size of previous bet), all-in shortcut |

---

## Roadmap at a Glance

```
DONE        IMMEDIATE PATCH      RELEASE 2            LATER
──────────  ───────────────────  ──────────────────   ──────────────────────────
MVP         Patch                Release 2            Backlog

Add         Fix bet input        Blind config         Side pots
players     labelling            Max buy-in config    Blind rotation
Buy-ins     One-touch Call       Max players          Seat positions
Pot         Dealer/SB/BB         Player positions     Betting history
tracking    display +            Betting streets      Player history
Stack       rotate button        Turn progression     Past sessions
tracking                         Min bet enforcement  Multi-device
Bet logging                      All-in constraints   Templates / photos
Check /                          Check prevention     Raise-size enforcement
Bet / Fold                       Auto blind posting
Award pot                        Split pot
```

---

## Decision Checkpoints

### After MVP launch ✅ (complete)
Post-MVP review completed. See `findings-and-recommendations.md`. Core loop metrics met. Bet input correctness issue and two high-friction gaps identified — addressed in the Immediate Patch.

### After Immediate Patch ships
Confirm the bet input confusion is resolved (no further mid-session restarts). Re-check likelihood-to-use signal across new sessions. If clean, proceed to Release 2.

### Before committing to Release 2
Confirm that the gap users are feeling is about **structure and rules** (turn order, blinds) rather than **interface clarity**. If it's the latter, fix before building on top of it.

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
