# Implementation Plan
## Poker Bet Tracker — Release 2

**Status:** Ready for development
**PRD:** `prd-v2.md`
**Informed by:** `findings-and-recommendations.md`

---

## Overview

Release 2 delivers two layers in sequence. Layer 1 contains self-contained fixes that require no new infrastructure — they should ship as soon as each is ready. Layer 2 adds poker structure and depends on Layer 1 being stable first.

| Layer | Items | Dependencies |
|---|---|---|
| Layer 1 | Bet input labelling, Call button, Dealer/blind display, Split pot | None — all self-contained |
| Layer 2 | Turn order, Betting streets, Blind config, Min bet enforcement, All-in constraints, Check prevention | Layer 1 stable; internal dependencies within Layer 2 (see section below) |

---

## State Shape Changes

The existing state shape is extended. No existing fields are removed or renamed.

```js
{
  screen: 'setup' | 'gameplay' | 'endHand' | 'handComplete',
  handNumber: 0,
  pot: 0,

  // NEW — Layer 1
  dealerIndex: 0,           // index into players[] of the current dealer

  // NEW — Layer 2
  smallBlind: null,         // configured small blind amount (number | null)
  bigBlind: null,           // configured big blind amount (number | null)
  currentStreet: null,      // null | 'preflop' | 'flop' | 'turn' | 'river'
  activePlayerIndex: null,  // index into players[] of the active player (null before game starts)
  lastBetSize: 0,           // size of the last bet or raise on the current street (for min raise)

  players: [
    {
      id,
      name,
      startingStack,
      currentStack,
      currentBet,           // bet placed in the current street only (resets on ADVANCE_STREET)
      hasFolded,
      isAllIn,              // NEW — Layer 2 (boolean)
    }
  ]
}
```

**Key semantic change for Layer 2:** `currentBet` will reset to `0` on `ADVANCE_STREET`. It represents the amount put in during the current betting street, not the full hand. The pot accumulates correctly regardless — it is incremented with each `PLACE_BET` and `CALL` dispatch.

---

## New and Modified Reducer Actions

### Layer 1

| Action | Type | Description |
|---|---|---|
| `CALL` | New | Calculates call amount (maxBet - player.currentBet), applies it. If stack < call amount, applies all remaining stack. Updates pot and player state. |
| `AWARD_SPLIT_POT` | New | Receives `winnerIds[]`. Divides pot equally among nominated players (floor division). Any remainder stays in pot and is not distributed. Resets bets and folded state. Transitions to `handComplete`. |
| `ROTATE_DEALER` | New | Manually increments `dealerIndex` by 1 (wraps). Available during gameplay as a correction mechanism. |

**Modified actions — Layer 1:**

- `NEXT_HAND`: Rotate `dealerIndex` by 1 (clockwise). SB and BB are derived from `dealerIndex` at render time — not stored separately in state.
- `AWARD_POT`: No logic change. `handComplete` screen updated to display split as an option.

### Layer 2

| Action | Type | Description |
|---|---|---|
| `SET_BLINDS` | New | Sets `smallBlind` and `bigBlind` on state from setup form. |
| `POST_BLINDS` | New | Deducts `smallBlind` from SB player's stack and `BB` from BB player's stack. Adds both to pot. Sets each player's `currentBet` accordingly. If a player's stack is less than their blind amount, posts their remaining stack and sets `isAllIn: true`. Fired automatically at the start of each hand after `NEXT_HAND` (or `START_GAME`). |
| `ADVANCE_STREET` | New | Increments `currentStreet` to next value. Resets all `currentBet` values to 0. Resets `lastBetSize` to 0. Sets `activePlayerIndex` to first active player after dealer. |
| `NEXT_PLAYER` | New | Manual fallback to advance `activePlayerIndex` to next non-folded, non-all-in player. |

**Modified actions — Layer 2:**

- `START_GAME`: Set `currentStreet` to `'preflop'`. Set `activePlayerIndex` to first player after dealer. Dispatch `POST_BLINDS` immediately after.
- `PLACE_BET`: After existing logic, update `lastBetSize` to the raise increment (betAmount - previousMaxBet, or betAmount if first bet of street). Advance `activePlayerIndex`. Mark player `isAllIn: true` if `currentStack` reaches 0.
- `CALL`: After existing logic, advance `activePlayerIndex`. Mark player `isAllIn: true` if stack reaches 0.
- `CHECK`: Advance `activePlayerIndex`.
- `FOLD`: Advance `activePlayerIndex`. After folding, check auto-advance condition (see 5.6).
- `NEXT_HAND`: Reset `currentStreet` to `'preflop'`. Reset `lastBetSize` to 0. Reset `isAllIn` to false for all players. Set `activePlayerIndex` to first player after new dealer. Dispatch `POST_BLINDS` immediately after.
- `AWARD_POT` / `AWARD_SPLIT_POT`: Clear `activePlayerIndex` and `currentStreet` on transition to `handComplete`.

---

## Component Changes

### Existing files modified

#### `reducer.js`
All state logic. All changes described in the actions table above. Analytics calls for new events added here, not in components.

#### `src/screens/SetupScreen.jsx`
- **Layer 2:** Add Small Blind and Big Blind number inputs below the player list, above the Start Game button.
- Both fields are required before Start Game enables.
- Validation: positive numbers, big blind ≥ small blind.
- On Start Game: dispatch `SET_BLINDS` before `START_GAME`.

#### `src/screens/GameplayScreen.jsx`
- **Layer 1:** No changes for bet labelling or call button (those live in `PlayerCard`).
- **Layer 1:** Add a small "Rotate dealer" text button visible during gameplay for manual correction.
- **Layer 2:** Add a street indicator (Pre-flop / Flop / Turn / River) below the pot display.
- **Layer 2:** Add a manual "Next street →" button accessible as a fallback when auto-advance doesn't trigger.

#### `src/screens/EndHandScreen.jsx`
- **Layer 1:** Add a "Split pot" toggle alongside the existing single-winner flow.
  - Default mode: single winner (existing behaviour, unchanged).
  - Split mode: allows multiple players to be selected (checkboxes or multi-tap); Award button awards an equal share to each selected player via `AWARD_SPLIT_POT`.
  - Toggle between modes via a clearly labelled control ("Split pot" / "One winner").
  - Odd-unit remainder is shown clearly (e.g. "Remainder $1 stays in pot").

#### `src/screens/HandCompleteScreen.jsx`
- **Layer 1:** Update to handle split pot result — display multiple winners if `winnerIds` is an array with length > 1.
- Show each winner's name and the amount they received.

#### `src/components/PlayerCard.jsx`
- **Layer 1 — Bet input labelling:**
  - When a wager exists, display the current maximum bet adjacent to the input field (e.g. "Current bet: $X").
  - Relabel the input field or add helper text (e.g. "Amount to add").
- **Layer 1 — Call button:**
  - Show a Call button when: (a) a wager exists in the hand and (b) this player's `currentBet` is less than the maximum `currentBet` among active players.
  - Button label shows the call amount (e.g. "Call $4").
  - If stack < call amount, label reads "All-in ($X)".
  - Hide Call button when the player has already matched the maximum bet.
  - Dispatches `CALL`.
- **Layer 1 — Dealer/blind indicators:**
  - Derive role from `dealerIndex` on state: dealer = dealerIndex, SB = (dealerIndex + 1) % activePlayers.length, BB = (dealerIndex + 2) % activePlayers.length.
  - Show small role badge (D / SB / BB) next to the player name.
  - Only shown to non-folded players; folded card shows no badge.
- **Layer 2 — Active player highlight:**
  - When `activePlayerIndex` matches this player, apply a visual highlight (border or background tint).
  - Action buttons (Check, Bet, Call, Fold) are only interactive for the active player. Other players' cards show buttons in a disabled/muted state.
- **Layer 2 — All-in indicator:**
  - When `isAllIn` is true, show an "All-in" badge. Card is visible but actions are hidden.
- **Layer 2 — Check prevention:**
  - Disable Check when the acting player's `currentBet` is less than the current street's maximum bet. (This replaces the existing `anyWager` check, which is less precise.)
- **Layer 2 — Min bet enforcement:**
  - In the bet input, display the minimum allowed bet (bigBlind for opening bet; lastBetSize for a raise).
  - Block confirm with inline error if the entered amount is below the minimum.

### New files

No new files are strictly required. If `PlayerCard` becomes unwieldy, the bet input panel can be extracted to `components/BetInputPanel.jsx`. This is a judgment call during implementation, not a requirement.

---

## Analytics Additions

All new events fire in `reducer.js` alongside state transitions, consistent with existing pattern.

| Event | Trigger | Key Properties |
|---|---|---|
| `call_placed` | `CALL` action | `call_amount`, `player_stack`, `hand_number` |
| `all_in_placed` | `PLACE_BET` or `CALL` when stack reaches 0 | `player_stack: 0`, `hand_number` |
| `split_pot_awarded` | `AWARD_SPLIT_POT` | `split_count`, `pot_amount`, `hand_number` |
| `street_advanced` | `ADVANCE_STREET` | `street_name`, `hand_number` |
| `blind_config_set` | `SET_BLINDS` | `small_blind`, `big_blind` |
| `check_blocked` | Attempted check while wager exists (if tracking client-side attempts) | `hand_number` |

---

## Layer 2 Internal Dependencies

Build Layer 2 items in this order — each has a hard dependency on items before it:

```
5.7 Blind config  ──────────────────────────┐
                                             ▼
5.5 Turn order  ──► 5.6 Betting streets ──► 5.8 Min bet enforcement
                         │
                         └──► 5.10 Check prevention (update to street-aware logic)

5.9 All-in constraints  (standalone, but easier after 5.5 + 5.6 are in place)
```

- **5.7 before 5.8:** Min bet enforcement requires `bigBlind` from blind config.
- **5.5 before 5.6:** Street auto-advance logic requires knowing whose turn it is and whether all players have acted.
- **5.6 before 5.8:** Min raise calculation requires knowing what street is active and what the last bet size was.
- **5.6 before 5.10:** Check prevention becomes street-aware once streets are in place.

---

## Build Order

| Step | Scope | What gets built |
|---|---|---|
| 1 | Layer 1 | Bet input labelling — add max wager display and "Amount to add" label to bet input in `PlayerCard` |
| 2 | Layer 1 | Call button — `CALL` action in reducer + Call button in `PlayerCard` with correct show/hide logic |
| 3 | Layer 1 | Dealer/blind display — `dealerIndex` in state, derive SB/BB at render, show badges in `PlayerCard`, rotate in `NEXT_HAND`, manual rotate button in `GameplayScreen` |
| 4 | Layer 1 | Split pot — `AWARD_SPLIT_POT` action, multi-select in `EndHandScreen`, multi-winner display in `HandCompleteScreen` |
| 5 | Layer 2 | Blind config — SB/BB inputs in `SetupScreen`, `SET_BLINDS` action, display on gameplay screen |
| 5a | Layer 2 | Automatic blind posting — `POST_BLINDS` action; deducts SB/BB from stacks, adds to pot, sets `currentBet` per player; dispatch after `START_GAME` and `NEXT_HAND`; partial blind / all-in handling if stack < blind amount |
| 6 | Layer 2 | Turn order — `activePlayerIndex` in state, highlight in `PlayerCard`, advance on every action, manual next player button |
| 7 | Layer 2 | Betting streets — `ADVANCE_STREET` action, street display in `GameplayScreen`, auto-advance logic, manual advance fallback, `currentBet` resets per street |
| 8 | Layer 2 | Min bet enforcement — minimum display and validation in bet input (depends on steps 5 + 7) |
| 9 | Layer 2 | All-in constraints — `isAllIn` player field, all-in badge, cap validation in `PLACE_BET`, all-in call in `CALL` |
| 10 | Layer 2 | Check prevention — update `anyWager` logic to street-aware: disable Check when player's `currentBet` < street maximum |
| 11 | Both | Analytics — wire all new events through reducer for both layers |
| 12 | Both | Mobile polish — review tap targets, active player visibility, badge legibility on small screens |

Layer 1 steps (1–4) are independent of each other and can be built in any order or in parallel. Layer 2 steps must follow the sequence from step 5 onward due to dependencies.

---

## Key Design Decisions

**Dealer/SB/BB derived at render, not stored.** Only `dealerIndex` is stored in state. SB = `(dealerIndex + 1) % activePlayers.length`, BB = `(dealerIndex + 2) % activePlayers.length`. This avoids keeping three fields in sync and keeps rotation logic simple — increment `dealerIndex` by 1 on `NEXT_HAND`.

**`currentBet` resets per street.** With streets active, `currentBet` tracks the amount a player has put in during the current street, not the entire hand. The pot (which accumulates correctly across streets) is the source of truth for total chips committed. This makes the call button calculation correct across streets.

**Split pot remainder rule.** Integer division only — no fractional amounts. Any remainder from odd-pot splits is displayed to users and stays in the pot. No remainder is distributed. This is the simplest rule that is also accurate.

**Active player restricts — does not block.** In Layer 2, action buttons are visually muted for non-active players, but not fully removed from the DOM. This preserves layout stability and avoids jarring shifts as the active player changes.

**Street auto-advance condition.** A street auto-advances when all non-folded, non-all-in players have a `currentBet` equal to the street maximum (bets are equalised) and each has acted at least once in the street. A "has acted" flag per player per street is the simplest implementation. Reset on `ADVANCE_STREET`.

**Manual overrides throughout.** Auto-rotation of dealer, auto-advance of active player, and auto-advance of streets all have manual fallback controls. The app is used in-person — players at the table can always see when something needs correcting. Overrides prevent the app from becoming a blocker.

**No routing library.** The `screen` field in state continues to drive which screen renders. Release 2 adds no new top-level screens — EndHandScreen is extended in place, not split.

---

## Out of Scope for This Build

Do not implement unless explicitly requested:

- Side pots (multi-way all-in with different stack depths)
- Raise-size enforcement beyond minimum (re-raise must be at least the size of the previous raise increment)
- Session or hand history
- Player photos, templates, multi-device support
