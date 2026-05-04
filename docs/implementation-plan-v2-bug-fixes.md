# Implementation Plan — V2 Enforcement Patch

## Poker Bet Tracker — Follow-up to Release 2 Plan

**Status:** Draft — planning  
**Parent plan:** `implementation-plan-v2.md`  
**PRD:** `prd-v2.md`

---

## 1. Purpose

The v2 implementation added dealer/blind display, streets, blinds posting, and an `activePlayerIndex` model, but several behaviours remain **advisory** rather than **enforced**. This document defines a focused patch to align gameplay with standard Texas Hold’em betting order, street closure, and UI labelling—without expanding scope into full tournament rules (side pots, time banks, etc.).

---

## 2. Current Issues (Summary)

| # | Issue | Symptom |
|---|--------|---------|
| A | Manual dealer rotation during play | `ROTATE_DEALER` is available on the gameplay screen; users can change D/SB/BB mid-hand or mid-street. |
| B | No turn enforcement | `PlayerCard` treats `activePlayerIndex === null` as “everyone active”; `NEXT_PLAYER` overrides order; any player can place bets after cycling with **Next player**. |
| C | Street closure not enforced | **Next street →** is manual. Play can continue with unmatched action or skip streets without the pot/bet state reflecting a completed round. |
| D | “Bet” label when facing action | When there is already a wager on the street, opening **Bet** should read **Raise** / **3-bet** / **4-bet**, etc. |

---

## 3. Target Behaviour (Rules Baseline)

### 3.1 Dealer rotation (manual)

- **Allowed:** While `screen === 'setup'` only—adjust dealer before **Start game** so SB/BB indices match the table.
- **Not allowed:** Dispatch `ROTATE_DEALER` during `screen === 'gameplay'` (including between streets and before **End hand**).
- **Automatic rotation:** Multi-way (`players.length ≥ 3`): on each `NEXT_HAND`, advance `dealerIndex` by one (clockwise), same as today.

### 3.2 Heads-up: blind seats and two-hand button cadence

**Static seat math (same index formula as multi-way):** SB = `(dealerIndex + 1) % n`, BB = `(dealerIndex + 2) % n`. For two players this still yields one seat as SB and one as BB relative to `dealerIndex`.

**Heads-up is unique for automatic progression across hands:** the implementation must **not** simply increment `dealerIndex` every `NEXT_HAND` the way it does for three or more players.

**Intended behaviour (locked in):**

1. The **dealer button** moves to the other player every **two** completed hands (not every hand).
2. Within that two-hand span, the player who **keeps the dealer seat** for the second consecutive hand **swaps blind role**: whoever was BB becomes SB (and vice versa) while the button **has not** yet moved to the other player.
3. After those two hands, the **other** player becomes dealer; the same staggered pattern repeats.

So SB/BB assignment alternates every hand, while the visible dealer button shifts every two hands—the schedules are **staggered**. Implementation should introduce explicit heads-up state (for example `headsUpPhase` / parity tied to `handNumber`, or an “effective” dealer vs “posting” overlay) so posting order and first-to-act preflop stay consistent with this cadence. Derive **effective** SB/BB/dealer-for-display for each hand from this schedule; wire `applyPostBlinds` and preflop `activePlayerIndex` to **effective** roles, not only raw `(dealerIndex+1)/(dealerIndex+2)` on every hand.

### 3.3 Who may act

- **Preflop:** First player to act is the **next eligible (non-folded, can still act) player clockwise after the big blind**, using the **effective BB seat** for that hand (including heads-up stagger—first to act preflop must match standard HU rules once BB is identified).
- **Post-flop:** First player to act is the **next eligible player clockwise after the dealer** (first live player left of the button).

**Enforcement:** `PLACE_BET`, `CALL`, `CHECK`, and `FOLD` apply **only** when the resolved player index matches `activePlayerIndex`. Otherwise the reducer returns the prior state (no-op).

**`NEXT_PLAYER`:** Remove entirely—delete the reducer branch and gameplay control (see §4). No dev-only fallback unless you add it back later.

### 3.4 When the betting round is complete

The round is complete when:

1. All non-folded players who can still volitionally act have **matched** the current street maximum (`currentBet` equal among those who are not all-in), and action has **closed** the betting (full orbit past the last aggressor—see implementation helper design in parent plan), **or**
2. Only one non-folded player remains (proceed toward **End hand** / showdown as today).

**Street transition — user confirmation (locked in):** When the round is complete and there is a further board street (`preflop` → flop → turn → river), do **not** silently mutate `currentStreet`. Instead:

1. Enter a **prompt state** (modal or full-width banner) with a short message, e.g. **“Deal Flop”**, **“Deal Turn”**, **“Deal River”**, as appropriate.
2. The user taps **Done** / **OK** to acknowledge.
3. Only then apply the same logical effect as today’s `ADVANCE_STREET`: reset street bets, set `currentStreet`, reset aggression count, set post-flop first actor, etc.

Until the user confirms, **no** betting on the next street should occur (no duplicate **Next street →** bypass). Remove or repurpose the old manual **Next street →** button so it cannot skip ahead of legal closure.

### 3.5 Bet vs raise labelling

Derive a **voluntary aggression index** per betting street (reset on confirmed street advance):

- First chips into an unopened pot on that street → **Bet** (or **Check** if allowed).
- Further voluntary increases → **Raise**, **3-bet**, **4-bet**, etc., per the counter table in the previous draft (`streetAggressionCount`).

---

## 4. Code-Level Plan

### 4.1 Reducer (`reducer.js`)

1. **`ROTATE_DEALER`** — Guard: if `state.screen !== 'setup'`, return `state`.
2. **`NEXT_HAND` (heads-up)** — Replace naive `dealerIndex++` every hand with the **two-hand stagger** described in §3.2; keep multi-way behaviour unchanged.
3. **`START_GAME` / `NEXT_HAND`** — Preflop first actor from **effective BB index** for that hand.
4. **`ADVANCE_STREET`** — Split into internal helper; **do not** call it directly when the round completes until UI confirms—either dispatch **`REQUEST_STREET_PROMPT`** state update or set `pendingStreetBanner: 'flop' | …`** so the screen can show copy.
5. **New action e.g. `CONFIRM_NEXT_STREET`** — Applies the actual street transition after the user taps Done on **Deal Flop / Turn / River**.
6. **Guards** on `PLACE_BET`, `CALL`, `CHECK`, `FOLD` — Must match `activePlayerIndex`.
7. **Delete `NEXT_PLAYER`** case and all dispatch sites.
8. **`isBettingRoundComplete`** — After valid actions, if true and not river → set prompt for next street instead of immediate advance.
9. **`streetAggressionCount`** — Reset on confirmed advance and on `NEXT_HAND`.

### 4.2 UI

1. Remove gameplay **Rotate dealer**; keep rotation only on setup if applicable.
2. **`PlayerCard`** — Strict active player highlighting; disable actions when not the actor.
3. **Street confirmation** — Modal or blocking sheet with title/body per next street + primary **Done** / **OK**.
4. **Bet / Raise / N-bet** labels from aggression count + `maxBet`.
5. Remove **Next player** control from `GameplayScreen.jsx`.

### 4.3 Tests (`reducer.test.js` and any component tests)

**Required updates:**

| Area | Change |
|------|--------|
| **`NEXT_PLAYER`** | Remove the entire `describe('NEXT_PLAYER')` block (or replace with “removed” smoke test that expects unknown actions noop—prefer deletion). |
| **`ROTATE_DEALER`** | Assert no-op when `screen === 'gameplay'`; keep/adjust setup-only tests if `ROTATE_DEALER` remains on setup. |
| **Turn enforcement** | Add cases: wrong `id` on `PLACE_BET` / `CALL` / `CHECK` / `FOLD` leaves state unchanged. |
| **Preflop first actor** | Multi-way: first actor is after effective BB. |
| **Heads-up** | New describe block: over a sequence of `NEXT_HAND` calls, dealer button moves every **two** hands; SB/BB roles alternate/stagger per §3.2; posting amounts hit correct stacks. |
| **Street closure** | When betting round completes, state indicates **pending** next street (prompt), not advanced `currentStreet`, until `CONFIRM_NEXT_STREET`. After confirm, `currentStreet` and bets match expectations. |
| **Regression** | Re-run full suite after removing `NEXT_PLAYER`; fix any tests that relied on manual advance. |

Optional: lightweight React test or interaction test that the modal appears with **Deal Flop** copy when transitioning from preflop—only if you already use component tests.

### 4.4 Analytics (`analytics.js` / `track` calls)

Treat instrumentation as **part of this patch**, not optional polish.

| Event | When | Suggested properties |
|-------|------|----------------------|
| `street_prompt_shown` | Betting round completes and UI shows Deal Flop / Turn / River | `next_street`, `hand_number` |
| `street_confirmed` | User taps Done on that prompt | `next_street`, `hand_number` |
| `turn_violation_attempt` | Dispatch ignored because wrong player acted | `action_type`, `hand_number` (low volume; useful for QA) |
| `dealer_rotate_blocked` | `ROTATE_DEALER` no-op outside setup | `screen` |

Keep existing events (`street_advanced`, `bet_placed`, etc.): fire **`street_advanced`** (or rename consistently) **when the street actually changes**—i.e. on **confirm**, not when the prompt appears—so funnels stay aligned with real gameplay progression.

**Dashboard note:** If Mixpanel reports depend on `street_advanced` timing, coordinate the event definition change so historical vs new data are understood.

---

## 5. Implementation Order

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| 1 | Guard `ROTATE_DEALER`; remove gameplay rotate UI | — |
| 2 | Heads-up `NEXT_HAND` stagger + tests | — |
| 3 | Preflop/post-flop `activePlayerIndex` from effective BB / dealer | Phase 2 for HU |
| 4 | Turn enforcement + remove `NEXT_PLAYER` (reducer, UI, tests) | Phase 3 |
| 5 | `isBettingRoundComplete` + prompt state + `CONFIRM_NEXT_STREET` + modal UI | Phase 4 |
| 6 | Aggression count + Bet/Raise/N-bet labels | Phase 4 |
| 7 | Analytics hooks + full test pass | Phases 1–6 |

---

## 6. Out of Scope (This Patch)

- Side pots, split pots beyond existing split winner flow, misdeal recovery.
- Forced straddles, antes, bomb pots.
- Exact WSOP wording for every edge case (all-in for less, skipped seats).

---

## 7. Done Criteria

- Dealer cannot be rotated after **Start game** from normal UI paths.
- Heads-up blind/button progression matches the **two-hand dealer stagger** and alternating SB/BB behaviour described in §3.2.
- Only the active player’s controls mutate pot/stack/bets on their turn; **`NEXT_PLAYER` is gone**.
- Betting rounds cannot advance streets illegally; **Deal Flop / Turn / River** appears and requires **Done** before the next street’s betting.
- Facing a wager, the primary chip-add control uses **Raise** / **N-bet** labelling as appropriate.
- Tests and analytics updated per §4.3 and §4.4.

---

## 8. Decisions (resolved)

| Topic | Decision |
|-------|----------|
| Heads-up geometry | Keep SB = `dealerIndex+1`, BB = `dealerIndex+2`; implement **unique** automatic progression so the dealer button moves **every two hands** while SB/BB roles **alternate/stagger** between those players each hand. |
| Street advance UX | Show a short notice (**Deal Flop**, **Deal Turn**, **Deal River**); user must press **Done** / **OK** before the app advances `currentStreet` and opens betting on the new street. |
| `NEXT_PLAYER` | Remove from reducer and UI entirely. |
