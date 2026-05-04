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

## Build Checklist

Layer 1 steps (1–4) are independent of each other and can be built in any order or in parallel. Layer 2 steps must follow the sequence from step 5 onward due to dependencies.

### Step 1 — Bet Input Labelling (Layer 1)
**Scope:** `PlayerCard.jsx`

- [x] When a wager exists among active players, show "Current bet: $X" adjacent to the bet input
- [x] Relabel the bet input field or add helper text: "Amount to add"
- [x] Ensure the label is hidden when no wager exists in the hand

---

### Step 2 — Call Button (Layer 1)
**Scope:** `reducer.js`, `PlayerCard.jsx`

- [x] Add `CALL` action to `reducer.js`
  - [x] Calculate call amount: `maxBet - player.currentBet`
  - [x] If `currentStack < callAmount`, apply only remaining stack (all-in call)
  - [x] Deduct call amount from `currentStack`
  - [x] Add call amount to `pot`
  - [x] Increase player's `currentBet` by call amount
  - [x] Fire `call_placed` analytics event with `call_amount`, `player_stack`, `hand_number`
- [x] Show Call button in `PlayerCard` when a wager exists and player's `currentBet` < max `currentBet` among active players
- [x] Button label shows "Call $X" where X is the call amount
- [x] If `currentStack < callAmount`, label reads "All-in ($X)" where X is the player's remaining stack
- [x] Hide Call button when player has already matched the maximum bet
- [x] Call button dispatches `CALL` with player id

---

### Step 3 — Dealer/Blind Display (Layer 1)
**Scope:** `reducer.js`, `GameplayScreen.jsx`, `PlayerCard.jsx`

- [x] Add `dealerIndex: 0` to `initialState` in `reducer.js`
- [x] Add `ROTATE_DEALER` action: increment `dealerIndex` by 1, wrap using `% players.length`
- [x] Update `NEXT_HAND` to rotate `dealerIndex` by 1 before resetting other hand state
- [x] Derive SB and BB at render time: SB = `(dealerIndex + 1) % players.length`, BB = `(dealerIndex + 2) % players.length`
- [x] Show D / SB / BB role badge next to player name in `PlayerCard`
- [x] Only show badges for non-folded players; folded cards show no badge
- [x] Add a "Rotate dealer" text button to `GameplayScreen` that dispatches `ROTATE_DEALER`

---

### Step 4 — Split Pot (Layer 1)
**Scope:** `reducer.js`, `EndHandScreen.jsx`, `HandCompleteScreen.jsx`

- [x] Add `AWARD_SPLIT_POT` action to `reducer.js`
  - [x] Accept `winnerIds[]` array
  - [x] Calculate share: `Math.floor(pot / winnerIds.length)`
  - [x] Add share to each winner's `currentStack`
  - [x] Remainder (`pot % winnerIds.length`) stays in pot field — do not distribute
  - [x] Reset all `currentBet` values to 0
  - [x] Reset all `hasFolded` to false
  - [x] Transition `screen` to `'handComplete'`
  - [x] Set `winnerIds` (plural) on state alongside existing `winnerId`
  - [x] Fire `split_pot_awarded` analytics event with `split_count`, `pot_amount`, `hand_number`
- [x] Add "Split pot" toggle to `EndHandScreen`
  - [x] Default mode: single winner (existing behaviour, unchanged)
  - [x] Split mode: allows multiple players to be selected (multi-tap or checkboxes)
  - [x] Award button dispatches `AWARD_SPLIT_POT` with selected player ids
  - [x] Display remainder clearly when pot does not divide evenly: "Remainder $1 stays in pot"
  - [x] Award button disabled until at least one winner is selected
  - [x] Folded players are greyed out and ineligible in both modes
- [x] Update `HandCompleteScreen` to handle multiple winners
  - [x] When `winnerIds` has length > 1, show each winner's name and the amount they received
  - [x] Winner rows highlighted in green (consistent with single-winner behaviour)

---

### Step 5 — Blind Config (Layer 2)
**Scope:** `reducer.js`, `SetupScreen.jsx`, `GameplayScreen.jsx`

- [x] Add `smallBlind: null` and `bigBlind: null` to `initialState`
- [x] Add `SET_BLINDS` action: set `smallBlind` and `bigBlind` from `action.smallBlind` / `action.bigBlind`
  - [x] Fire `blind_config_set` analytics event with `small_blind`, `big_blind`
- [x] Add SB and BB number inputs to `SetupScreen` below the player list
- [x] Both fields are required before Start Game button enables
- [x] Validate: both values are positive numbers; `bigBlind >= smallBlind`
- [x] Dispatch `SET_BLINDS` before `START_GAME` on Start Game button press
- [x] Display configured blind values on `GameplayScreen` (e.g. "Blinds: $1/$2")

---

### Step 5a — Automatic Blind Posting (Layer 2)
**Scope:** `reducer.js`

- [x] Add `POST_BLINDS` action to `reducer.js`
  - [x] Identify SB player: `players[(dealerIndex + 1) % players.length]`
  - [x] Identify BB player: `players[(dealerIndex + 2) % players.length]`
  - [x] Post SB: deduct `min(smallBlind, sbPlayer.currentStack)` from SB stack; add to pot; set SB `currentBet`
  - [x] If SB's stack is less than `smallBlind`, post remaining stack and set `isAllIn: true` for SB
  - [x] Post BB: deduct `min(bigBlind, bbPlayer.currentStack)` from BB stack; add to pot; set BB `currentBet`
  - [x] If BB's stack is less than `bigBlind`, post remaining stack and set `isAllIn: true` for BB
- [x] Dispatch `POST_BLINDS` automatically after `START_GAME` (component or combined reducer logic)
- [x] Dispatch `POST_BLINDS` automatically after `NEXT_HAND`

---

### Step 6 — Turn Order (Layer 2)
**Scope:** `reducer.js`, `PlayerCard.jsx`, `GameplayScreen.jsx`

- [x] Add `activePlayerIndex: null` to `initialState`
- [x] Add `NEXT_PLAYER` action: advance `activePlayerIndex` to next non-folded, non-all-in player (wraps)
- [x] Update `START_GAME` to set `activePlayerIndex` to first player after dealer (skip folded/all-in)
- [x] Update `PLACE_BET` to advance `activePlayerIndex` after existing bet logic
- [x] Update `CALL` to advance `activePlayerIndex` after existing call logic
- [x] Update `CHECK` to advance `activePlayerIndex`
- [x] Update `FOLD` to advance `activePlayerIndex` after marking player as folded
- [x] Apply visual highlight in `PlayerCard` when player index matches `activePlayerIndex`
- [x] Action buttons (Check, Bet, Call, Fold) are disabled/muted for non-active players
- [x] Add manual "Next player →" button to `GameplayScreen` as fallback; dispatches `NEXT_PLAYER`

---

### Step 7 — Betting Streets (Layer 2)
**Scope:** `reducer.js`, `GameplayScreen.jsx`

- [x] Add `currentStreet: null` and `lastBetSize: 0` to `initialState`
- [x] Add `ADVANCE_STREET` action
  - [x] Increment `currentStreet`: `null → 'preflop'`, `'preflop' → 'flop'`, `'flop' → 'turn'`, `'turn' → 'river'`, `'river' → null`
  - [x] Reset all player `currentBet` values to 0
  - [x] Reset `lastBetSize` to 0
  - [x] Set `activePlayerIndex` to first active (non-folded, non-all-in) player after dealer
  - [x] Fire `street_advanced` analytics event with `street_name`, `hand_number`
- [x] Update `START_GAME` to set `currentStreet: 'preflop'`
- [x] Update `NEXT_HAND` to reset `currentStreet` to `'preflop'` and `lastBetSize` to 0
- [x] Update `AWARD_POT` and `AWARD_SPLIT_POT` to clear `currentStreet` and `activePlayerIndex` on transition to `handComplete`
- [x] Display current street in `GameplayScreen` below the pot: Pre-flop / Flop / Turn / River
- [x] Add "Next street →" button to `GameplayScreen` as manual fallback; dispatches `ADVANCE_STREET`

---

### Step 8 — Min Bet Enforcement (Layer 2)
**Scope:** `reducer.js`, `PlayerCard.jsx`
**Depends on:** Steps 5 (blind config) and 7 (streets)

- [x] Update `PLACE_BET` to record `lastBetSize`
  - [x] If no previous bet on street: `lastBetSize = betAmount`
  - [x] If raising: `lastBetSize = betAmount - previousMaxBet`
- [x] Display minimum allowed bet in the bet input in `PlayerCard`
  - [x] Opening bet: show "Min: $X" where X is `bigBlind`
  - [x] Raise: show "Min: $X" where X is `lastBetSize`
- [x] Block confirm with inline error if entered amount < minimum
- [x] Allow all-in bets below minimum (player's full stack is always valid)

---

### Step 9 — All-In Constraints (Layer 2)
**Scope:** `reducer.js`, `PlayerCard.jsx`

- [x] Add `isAllIn: false` to each player in `initialState` players array
- [x] Update `PLACE_BET`: set `isAllIn: true` when `currentStack` reaches 0 after bet
  - [x] Fire `all_in_placed` analytics event
- [x] Update `CALL`: set `isAllIn: true` when `currentStack` reaches 0 after call
  - [x] Fire `all_in_placed` analytics event
- [x] Update `NEXT_HAND`: reset `isAllIn: false` for all players
- [x] Show "All-in" badge in `PlayerCard` when `isAllIn` is true
- [x] Hide action buttons (Check, Bet, Call, Fold) for all-in players
- [x] Cap bet amount at player's `currentStack` in `PLACE_BET` — reject bets above stack

---

### Step 10 — Check Prevention (Layer 2)
**Scope:** `reducer.js`, `PlayerCard.jsx`
**Depends on:** Step 7 (streets)

- [x] Replace the existing `anyWager` check logic with street-aware logic
- [x] Disable Check when `player.currentBet < max(currentBet among active players on current street)`
- [x] Disable Check applies only to the active player (non-active players are already disabled)

---

### Step 11 — Analytics (Both Layers)
**Scope:** `reducer.js`

- [x] `call_placed`: fires on `CALL` with `call_amount`, `player_stack`, `hand_number`
- [x] `all_in_placed`: fires on `PLACE_BET` or `CALL` when stack reaches 0 with `player_stack: 0`, `hand_number`
- [x] `split_pot_awarded`: fires on `AWARD_SPLIT_POT` with `split_count`, `pot_amount`, `hand_number`
- [x] `street_advanced`: fires on `ADVANCE_STREET` with `street_name`, `hand_number`
- [x] `blind_config_set`: fires on `SET_BLINDS` with `small_blind`, `big_blind`
- [x] All new events follow the existing pattern: fired in `reducer.js` as side effects, not in components

---

### Step 12 — Mobile Polish (Both Layers)

- [x] Review tap target sizes for new buttons (Rotate dealer, Next street, Next player, Call)
- [x] Confirm active player highlight is clearly visible on small screens
- [x] Confirm D / SB / BB badges are legible on small screens
- [x] Confirm "All-in" badge does not break player card layout
- [x] Confirm split pot flow is usable on mobile (multi-select targets are large enough)
- [x] Smoke test the full hand flow on a mobile viewport

---

## Key Design Decisions

**Dealer/SB/BB derived at render, not stored.** Only `dealerIndex` is stored in state. SB = `(dealerIndex + 1) % activePlayers.length`, BB = `(dealerIndex + 2) % activePlayers.length`. This avoids keeping three fields in sync and keeps rotation logic simple — increment `dealerIndex` by 1 on `NEXT_HAND`.

**`currentBet` resets per street.** With streets active, `currentBet` tracks the amount a player has put in during the current betting street, not the entire hand. The pot (which accumulates correctly across streets) is the source of truth for total chips committed. This makes the call button calculation correct across streets.

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
