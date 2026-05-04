# Implementation Plan — V2 Enforcement Patch

## Poker Bet Tracker — Follow-up to Release 2 Plan

**Status:** Implemented — see **§9 Post-release refinements** for follow-on UX and betting-input rules.  
**Parent plan:** `implementation-plan-v2.md`  
**PRD:** `prd-v2.md`

---

## 1. Purpose

The v2 implementation added dealer/blind display, streets, blinds posting, and an `activePlayerIndex` model, but several behaviours remained **advisory** rather than **enforced**. This document defined a patch to align gameplay with Texas Hold’em-style betting order, street closure, and UI labelling—without full tournament rules (side pots, time banks, etc.).

---

## 2. Original Issues (Summary)

| # | Issue | Symptom |
|---|--------|---------|
| A | Manual dealer rotation during play | `ROTATE_DEALER` was available on the gameplay screen; users could change D/SB/BB mid-hand or mid-street. |
| B | No turn enforcement | `PlayerCard` treated everyone as active when `activePlayerIndex === null`; **Next player** overrode order. |
| C | Street closure not enforced | **Next street →** was manual; rounds could be skipped illegally. |
| D | “Bet” label when facing action | With a wager on the street, actions should read **Raise** / **3-bet** / **4-bet**, not **Bet**. |

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

**`FOLD`:** Allowed **only** when the player is **facing** an unmatched wager this street: `maxBet > 0` and `currentBet < maxBet` (same condition as **Call**). If there is **no** wager on the street (`maxBet === 0`) or the player **already matched** the max (`currentBet >= maxBet`), **Fold** is illegal — use **Check** or **Bet** / **Raise** instead (including BB preflop option: **Check** or **Raise**, not fold).

**All-in:** Players with **`isAllIn`** never receive **`activePlayerIndex`** for betting (turn order skips them). Any **`PLACE_BET` / `CALL` / `CHECK` / `FOLD`** from an all-in seat is rejected (**`all_in_action_blocked`**). **`PlayerCard`** already hides actions for all-in seats.

**Sole survivor (no callers left):** If exactly **one** player can still volitionally act and **everyone else** in the hand is folded or all-in, and that player **owes no call** (`currentBet >= maxBet`, including **`maxBet === 0`** on a fresh street), the app **auto-advances** as if they checked (**`check_selected`** with **`auto_sole_actor: true`**) so the hand does not stall when bets cannot meaningfully be answered.

**`NEXT_PLAYER`:** Remove entirely—delete the reducer branch and gameplay control (see §4). No dev-only fallback unless you add it back later.

### 3.4 When the betting round is complete

The round is complete when:

1. All non-folded players who can still volitionally act have **matched** the current street maximum (`currentBet` equal among those who are not all-in), and action has **closed** the betting (full orbit past the last aggressor—see implementation helper design in parent plan), **or**
2. Only one non-folded player remains (proceed toward **End hand** / showdown as today).

**Street transition — user confirmation (locked in):** When the round is complete and there is a further board street (`preflop` → flop → turn → river), do **not** silently mutate `currentStreet`. Instead:

1. Set **`pendingStreetPrompt`** (`'flop' | 'turn' | 'river'`). Show a blocking modal with title/body (implemented as **Deal the flop** / **Deal the turn** / **Deal the river** and instructions to deal the board cards **before** confirming).
2. The user taps **OK** → **`CONFIRM_NEXT_STREET`**.
3. **`advanceStreetCore`** runs: reset street `currentBet`s, set `currentStreet`, reset `streetAggressionCount`, set post-flop first actor.

Until the user confirms, **no** betting on the next street occurs. Manual **Next street →** and **`ADVANCE_STREET`** as a user bypass are removed (`ADVANCE_STREET` is a no-op).

### 3.5 Bet vs raise labelling and chip input

- Derive **`streetAggressionCount`** per betting street (reset on confirmed street advance and new hand).
- **Open** (no wager on this street yet, post-flop): button **Bet**.
- **Facing a wager** (`maxBet > 0`): never **Bet** — use **Raise**, **3-bet**, **4-bet**, etc.
- **Voluntary chip entry:** **`PLACE_BET`** carries **`targetStreetBet`** = **total** wager **this street** for the acting player (not an additive delta). The reducer computes **increment** = `targetStreetBet - currentBet` (capped by stack) and adds that increment to the pot.
- **Minimum open / raise** enforced in reducer (**§9**); **`bet_placed`** **`bet_amount`** = chip **increment**, not the UI total input.

---

## 4. Code-Level Plan

### 4.1 Reducer (`reducer.js`)

1. **`ROTATE_DEALER`** — Only when `screen === 'setup'`; otherwise no-op + `dealer_rotate_blocked`.
2. **`NEXT_HAND`** — Heads-up: **`headsUpStreak`** two-hand dealer stagger + blind swap; 3+: rotate dealer each hand.
3. **`START_GAME` / `NEXT_HAND`** — **`applyPostBlinds`** then sets **`firstActorIndex` / `activePlayerIndex`** to **`nextEligibleIndex(players, bbIdx)`** after posting (so all-in blinds do not retain the button). **`applySoleActorAutoPasses`** runs on the result. If **no** seat can act (everyone all-in), **`maybeStreetPromptAfterRound`** runs when appropriate.
4. **`pendingStreetPrompt`** — Set when betting completes (not on river); cleared by **`CONFIRM_NEXT_STREET`** or **End hand**.
5. **`CONFIRM_NEXT_STREET`** — Runs **`advanceStreetCore`**; emits **`street_confirmed`** + **`street_advanced`**.
6. **`ADVANCE_STREET`** — **No-op** (no user bypass).
7. **`PLACE_BET`** — **`targetStreetBet`** = total this street; legacy **`amount`** = increment. Min open / min raise / short all-in rules; **`lastBetSize`** = raise increment over previous max.
8. **`CHECK`** — Preflop: **BB only**, **`maxBet === bigBlind`** (no raise).
9. **Turn guards** — `PLACE_BET`, `CALL`, `CHECK`, `FOLD` require **`activePlayerIndex`**; **`turn_violation_attempt`** otherwise. **All-in** seats: **`all_in_action_blocked`** (no **`turn_violation_attempt`**).
10. **`nextEligibleIndex`** — Returns **`null`** when no non-folded, non-all-in player exists; callers complete the street / prompt instead of pointing **`activePlayerIndex`** at an all-in seat.
11. **`applySoleActorAutoPasses`** — After each action and on **`advanceStreetCore`**, skips stray all-in **`activePlayerIndex`** and chains **auto-check** for the **sole** volitional player when they have nothing to call.
12. **`FOLD`** — Only when facing a wager (`maxBet > 0` and player’s `currentBet < maxBet`); otherwise no-op + **`fold_blocked`** (`reason`: **`no_wager`** | **`no_call_required`**).
13. **`NEXT_PLAYER`** — Removed.
14. **`isBettingRoundClosed`** — **`nextIdx === null`** ⇒ closed; also uses **`lastRaisePlayerIndex`** where applicable.
15. **`streetAggressionCount`** — Reset on street confirm and **`NEXT_HAND`**.

### 4.2 UI

1. **`SetupScreen`** — **Rotate dealer** (2+ players); gameplay has no rotate.
2. **`GameplayScreen`** — **`PROMPT_COPY`**: “Deal the flop / turn / river” + deal-then-confirm body; **OK** → **`CONFIRM_NEXT_STREET`**.
3. **`PlayerCard`** — Active-only; disabled during prompt; **DEALER** / **SMALL BLIND** / **BIG BLIND**; preflop check rules; voluntary chip button rules (**§9**); compact **Raise to:** / **Bet to:** + **Minimum:** copy; **Fold** only when **Call** would apply (`showFold === showCall`).

### 4.3 Tests (`src/__tests__/reducer.test.js`)

| Area | Notes |
|------|--------|
| **`makeState`** | Spreads **`initialState`**. |
| **`ROTATE_DEALER`** | Setup vs gameplay. |
| **Turn enforcement** | Wrong-player **`PLACE_BET`** with **`targetStreetBet`**. |
| **`PLACE_BET`** | **`targetStreetBet`** totals; **`ADVANCE_STREET`** no-op; **`CONFIRM_NEXT_STREET`** replaces old street advance tests. |
| **HU `NEXT_HAND`** | **`headsUpStreak`** / dealer cadence. |
| **initialState shape** | **`headsUpStreak`**, **`firstActorIndex`**, **`pendingStreetPrompt`**, **`streetAggressionCount`**. |
| **Preflop `CHECK`** | **`describe('CHECK — preflop big blind only')`** — non-BB no-op; BB CHECK advances when `maxBet === bigBlind`. |
| **`FOLD`** | **`describe('FOLD — facing wager only')`** — no wager / matched max no-op; **`Action advance`** uses facing-bet state for a legal fold. |
| **All-in / sole actor** | **`describe('All-in — cannot act; sole survivor auto-pass')`** — **`nextEligibleIndex`** null; all-in **`PLACE_BET`** no-op; **`CONFIRM_NEXT_STREET`** auto-passes empty flop when only one player can bet. |

### 4.4 Analytics (`track` in `reducer.js`; helper unchanged in `analytics.js`)

| Event | When | Properties |
|-------|------|------------|
| `street_prompt_shown` | Prompt displayed | `next_street`, `hand_number` |
| `street_confirmed` | **OK** on modal | `next_street`, `hand_number` |
| `street_advanced` | **`advanceStreetCore`** (real street change) | `street_name`, `hand_number` |
| `turn_violation_attempt` | Wrong player | `action_type`, `hand_number` |
| `all_in_action_blocked` | **`PLACE_BET` / `CALL` / `CHECK` / `FOLD`** while seat **`isAllIn`** | `action_type`, `hand_number` |
| `check_selected` | User **Check** or **sole-survivor auto pass** | `hand_number`; optional **`auto_sole_actor: true`** |
| `dealer_rotate_blocked` | Rotate outside setup | `screen` |
| `fold_blocked` | Illegal **`FOLD`** (no street wager, or already matched max) | **`reason`**: `no_wager` \| `no_call_required`, `hand_number` |
| `bet_placed` | **`PLACE_BET`** succeeds | **`bet_amount`** = **chip increment** to pot; `hand_number`, `player_stack` |

**Note:** **`bet_amount`** is always chips added this action, not the UI “total wager” field. Optional future: add **`total_wager`** or **`target_street_bet`** for analysis.

**`street_advanced`** fires on confirm, **not** on **`street_prompt_shown`**.

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
| 8 | Total-wager **`PLACE_BET`**, BB-only preflop check, voluntary-button visibility, role/prompt copy (**§9**) | Phases 1–7 |

---

## 6. Out of Scope (This Patch)

- Side pots, split pots beyond existing split winner flow, misdeal recovery.
- Forced straddles, antes, bomb pots.
- Exact WSOP wording for every edge case (all-in for less, skipped seats).

---

## 7. Done Criteria

- Dealer cannot be rotated after **Start game** from normal UI paths (rotate only on **setup**).
- Heads-up blind/button progression matches §3.2 (**`headsUpStreak`**).
- Only the active player’s controls mutate pot/stack/bets; **`NEXT_PLAYER`** removed.
- Streets advance only after legal betting closure + **`CONFIRM_NEXT_STREET`** (modal **OK**).
- Facing a wager: voluntary control never labelled **Bet**; **Raise** / **N-bet** only when `maxBet > 0`.
- Preflop **Check** only for **BB** with **no raise** (`maxBet === bigBlind`); reducer and UI aligned.
- **Fold** only when a **call** is required to continue (`maxBet > 0` and stack behind); reducer and **`PlayerCard`** aligned; **`fold_blocked`** on illegal attempts.
- **All-in** seats never act; turn skips them; **`all_in_action_blocked`** if dispatch targets an all-in seat. **Sole** player with chips and **no call** facing all-in field auto-advances (**`auto_sole_actor`** on **`check_selected`**).
- **`PLACE_BET`** uses **total street wager** (**`targetStreetBet`**); **`bet_placed.bet_amount`** = chip increment.
- Seat tags and street modal copy match §9.
- Tests (**§4.3**) and analytics contract (**§4.4**) documented and passing.

---

## 8. Decisions (resolved)

| Topic | Decision |
|-------|----------|
| Heads-up geometry | Keep SB = `dealerIndex+1`, BB = `dealerIndex+2`; implement **unique** automatic progression so the dealer button moves **every two hands** while SB/BB roles **alternate/stagger** between those players each hand. |
| Street advance UX | Blocking modal + **OK** → **`CONFIRM_NEXT_STREET`**; instructional copy per **`PROMPT_COPY`** (**Deal the flop / turn / river**). |
| `NEXT_PLAYER` | Remove from reducer and UI entirely. |
| Chip input | **Total wager this street** (`targetStreetBet`); legacy **`amount`** increment still accepted in reducer. |

---

## 9. Post-release refinements (implemented)

These extend the baseline plan without replacing core enforcement.

| Topic | Behaviour |
|-------|-----------|
| **Total wager** | UI and primary dispatch: **`targetStreetBet`**. Reducer derives increment; **`bet_placed.bet_amount`** = chips added. |
| **Voluntary button** | Shown for **open** (post-flop, `maxBet === 0`), **facing bet** (Call + Raise / N-bet), or **BB preflop option** (Check + Raise). Hidden when only **Check** applies (matched stacks). |
| **Preflop check** | Only **BB**, only if **`maxBet === bigBlind`**. |
| **Role labels** | **DEALER**, **SMALL BLIND**, **BIG BLIND**. |
| **Street prompts** | Titles + body: deal physical cards **then** tap **OK**. |
| **Min open / raise** | Validated in reducer; short **all-in** raise allowed when stack cannot satisfy full min raise. |
| **Fold** | Reducer + UI: only when **`showCall`** (facing a higher wager); no fold on a **free check** or **open** street with no bet. |
| **All-in / sole actor** | **`nextEligibleIndex`** skips all-in; **`applySoleActorAutoPasses`** auto-checks when only one player can bet and **`currentBet >= maxBet`**; blinds sync **`firstActor`/`active`** after **`applyPostBlinds`**. |
