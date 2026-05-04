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
MVP success metrics have been met. See `findings-and-recommendations.md` for the full post-MVP review. The **Immediate Patch** items, **Release 2** scope, and the **v2 enforcement patch** (`implementation-plan-v2-bug-fixes.md`) are **shipped** — total-street wager UX, Call, role tags, split pot, enforced turns, street confirmation modal, blind posting, and core raise/check/fold guardrails.

---

## Immediate Patch — Correctness & High-Friction Fixes

**Goal:** Fix tracked-state correctness and high-friction gaps from post-MVP feedback. **Status: shipped** (evolved into total-wager UX rather than “increment only” labelling).

**What's included**

| Area | Work |
|---|---|
| Bet input UX | **Total wager for the current street** — *Raise to* / *Bet to* with **Minimum:** and validation; reducer records chip increment to pot |
| Actions | One-touch **Call** (incl. all-in call) |
| Position display | **DEALER / SB / BB** on setup and gameplay; **Rotate dealer** on **setup only**; automatic rotation on each new hand (`NEXT_HAND`), not a manual “end of hand only” rotate |

**Why it landed before full enforcement**

Call and clearer betting input are self-contained. Role display on setup lets the table align the phone before **Start game**; enforcement then locks turn order and streets without mid-hand dealer edits.

---

## Release 2 — Structure & Rules

**Goal:** Make the app feel more like real poker by adding turn awareness, betting streets, and rule guardrails.

**Trigger:** Met — Immediate patch + Release 2 + enforcement patch shipped.

### Candidates

| Area | Features |
|---|---|
| Configuration | Configure blind levels (max buy-in / max players remain roadmap candidates) |
| Gameplay support | Role tags, current betting street, **enforced** active player (no manual next-player bypass) |
| Blind posting | Automatic SB/BB deduction at hand start |
| Rules enforcement | Min open/raise (with short all-in raise), stack caps, check/fold legality, street advance only after round closes + **confirm modal** |
| End hand | Split pot — equal division; odd chip remains in pot |

**Note on split pot vs side pots:** **Split pot** is implemented. **Side pots** (multi-way all-ins with unequal stacks) remain backlog.

### Prioritisation guidance
Historical sequencing: turn enforcement and streets, then blind config/posting, then bet-rule validation. See `implementation-plan-v2.md` and `implementation-plan-v2-bug-fixes.md` for what actually shipped.

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
| Rules | Full tournament raise-reopen rules, all-in shortcut, cap games |

---

## Roadmap at a Glance

```
DONE (incl. enforcement)     LATER
──────────────────────────   ──────────────────────────
MVP + Patch + Release 2      Backlog

Add players / buy-ins          Side pots
Pot / stack / bet logging      Seat positions / history
Total-street wager + Min       Multi-device
One-touch Call               Templates / photos
DEALER/SB/BB (setup+play)      Full reopening / cap rules
Rotate dealer (setup only)     Advanced pot logic
Enforced turn order
Streets + deal-then-OK modal
Blind config + auto post
Min bet/raise + short AI raise
Check/fold rules (BB pre OK)
Split pot
Busted-out session handling
```

---

## Decision Checkpoints

### After MVP launch ✅ (complete)
Post-MVP review completed. See `findings-and-recommendations.md`. Core loop metrics met.

### After Immediate Patch ✅
Shipped: total-wager bet UX, Call, role tags (setup + play), split pot foundation.

### Release 2 + enforcement ✅
Shipped: enforced turns, street modal, blind posting, min raise rules, fold/check guards, busted-out handling. Monitor Mixpanel for **`turn_violation_attempt`**, **`fold_blocked`**, and session depth.

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
