# User Flow & Wireframes
## Poker Bet Tracker — MVP

---

## User Flow

The MVP supports a single continuous loop: set up a game, play hands, repeat.

```
┌─────────────────────────────────────────────────────┐
│                   OPEN APP                          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              SCREEN 1: GAME SETUP                   │
│                                                     │
│  • Enter player name                                │
│  • Enter buy-in amount                              │
│  • Add another player (repeat)                      │
│  • Tap "Start Game"                                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            SCREEN 2: GAMEPLAY                       │
│                                                     │
│  • Pot total visible at top                         │
│  • Each player card shows: name, stack, current bet │
│  • Tap a player to take action                      │
│    ├── Check (if no current wager)                  │
│    ├── Bet (enter amount → confirm)                 │
│    └── Fold                                         │
│  • Tap "End Hand" when ready                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            SCREEN 3: END HAND                       │
│                                                     │
│  • Pot total shown                                  │
│  • Select winner from active players                │
│  • Tap "Award Pot"                                  │
│  • Winner stack updates                             │
│  • Bets and pot reset                               │
└─────────────────────┬───────────────────────────────┘
                      │
              ┌───────┴────────┐
              │                │
              ▼                ▼
       Play another        End session
         hand              (close app)
              │
              ▼
     Return to SCREEN 2
     (same players, updated stacks)
```

---

## Screen 1 — Game Setup

**Purpose:** Add players and their starting stacks before the first hand.

```
┌──────────────────────────────┐
│                              │
│       🃏 Poker Tracker       │
│                              │
│  ┌────────────────────────┐  │
│  │ Player name            │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Buy-in amount          │  │
│  └────────────────────────┘  │
│                              │
│  [ + Add player ]            │
│                              │
│  ─────────────────────────   │
│                              │
│  Players added:              │
│  • Alex — $50                │
│  • Jordan — $50              │
│                              │
│  ─────────────────────────   │
│                              │
│  [ Start Game ]              │
│                              │
└──────────────────────────────┘
```

**Interaction notes:**
- "Add player" appends the entered name and buy-in to the list and clears the fields
- Minimum 2 players required to enable "Start Game"
- Empty name or missing/invalid buy-in shows inline validation error
- Players listed below the form with name and buy-in visible before starting

---

## Screen 2 — Gameplay

**Purpose:** Central view for the active hand. Shows pot, all players, and enables actions.

```
┌──────────────────────────────┐
│                              │
│         POT: $40             │  ← always prominent at top
│                              │
│  ┌────────────────────────┐  │
│  │ Alex                   │  │
│  │ Stack: $30   Bet: $20  │  │
│  │ [ Check ] [ Bet ] [Fold]│  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Jordan                 │  │
│  │ Stack: $30   Bet: $20  │  │
│  │ [ Check ] [ Bet ] [Fold]│  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Sam  [FOLDED]          │  │  ← greyed out, no actions
│  │ Stack: $50   Bet: $0   │  │
│  └────────────────────────┘  │
│                              │
│  [ End Hand ]                │
│                              │
└──────────────────────────────┘
```

**Interaction notes:**
- Pot total updates immediately when a bet is confirmed
- Tapping "Bet" opens a numeric input with a "Confirm" button
- Bet validation: blocks empty, zero, negative, or above-stack amounts
- Tapping "Fold" immediately marks the player as folded (greyed out card, no actions shown)
- Tapping "Check" has no numeric input — just confirms the action
- "End Hand" is always accessible; does not require all players to have acted (MVP does not enforce turn order)

### Bet entry state (inline)

```
┌────────────────────────────┐
│ Alex                       │
│ Stack: $50   Bet: $0       │
│                            │
│  Enter bet:                │
│  ┌──────────────────────┐  │
│  │ $                    │  │
│  └──────────────────────┘  │
│  [ Confirm ] [ Cancel ]    │
└────────────────────────────┘
```

---

## Screen 3 — End Hand

**Purpose:** Close the hand, select the winner, award the pot, and prepare for the next hand.

```
┌──────────────────────────────┐
│                              │
│       Hand Complete          │
│                              │
│       Pot: $80               │
│                              │
│  Who won?                    │
│                              │
│  ○  Alex     (Stack: $20)    │
│  ○  Jordan   (Stack: $20)    │
│                              │
│  (Sam folded — not eligible) │
│                              │
│  [ Award Pot ]               │
│                              │
└──────────────────────────────┘
```

**After awarding:**

```
┌──────────────────────────────┐
│                              │
│   ✓ Alex wins $80            │
│                              │
│   Updated stacks:            │
│   Alex    — $100             │
│   Jordan  — $20              │
│   Sam     — $50              │
│                              │
│   [ Start Next Hand ]        │
│                              │
└──────────────────────────────┘
```

**Interaction notes:**
- Only non-folded players are selectable as winner
- "Award Pot" is disabled until a winner is selected
- After awarding, bets reset to $0, pot resets to $0, folded states clear
- "Start Next Hand" returns to the gameplay screen with updated stacks

---

## State Transitions

```
SETUP
  └─ [Start Game] ──────────────► GAMEPLAY (hand 1)
                                       │
                              [End Hand]│
                                       ▼
                                  END HAND FLOW
                                       │
                            [Award Pot]│
                                       ▼
                                  HAND COMPLETE
                                       │
                       [Start Next Hand]│
                                       ▼
                                  GAMEPLAY (hand 2+)
```

---

## Information Hierarchy

Consistent across all gameplay states:

| Priority | Element | Why |
|---|---|---|
| 1 | Current pot | The number everyone cares most about |
| 2 | Player stacks | Shows who's winning or at risk |
| 3 | Player bets | Lets players see what's already in |
| 4 | Actions | Visible but secondary to game state |

---

## Validation Summary

| Input | Invalid condition | Behaviour |
|---|---|---|
| Player name | Empty | Inline error, blocks add |
| Buy-in amount | Empty, zero, negative, non-numeric | Inline error, blocks add |
| Bet amount | Empty, zero, negative, above stack | Inline error, blocks confirm |
| Winner selection | None selected | "Award Pot" disabled |
| Start game | Fewer than 2 players | "Start Game" disabled |
