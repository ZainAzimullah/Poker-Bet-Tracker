# Implementation Plan
## Poker Bet Tracker — MVP

**Status:** Approved, not yet started

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React + Vite | Fast dev server, Vercel-friendly build output |
| Styling | Tailwind CSS v4 | Utility-first, mobile-first, minimal config |
| State | useReducer (React built-in) | Predictable transitions, no external library needed for MVP complexity |
| Analytics | Mixpanel Browser SDK | Matches event spec in prd.md §13 |
| Deployment | Vercel | Zero-config for Vite projects |

---

## Project Setup & Configuration

1. Scaffold with `create vite@latest` (React + JS)
2. Install and configure Tailwind CSS v4
3. Add `vercel.json` with SPA rewrite fallback:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
4. Add `.env.example` with `VITE_MIXPANEL_TOKEN=` placeholder
5. Create `src/analytics.js` — thin wrapper around Mixpanel (`init`, `track`); no-ops gracefully if token is missing

---

## State Shape

```js
{
  screen: 'setup' | 'gameplay' | 'endHand' | 'handComplete',
  handNumber: 0,
  pot: 0,
  players: [
    {
      id,
      name,
      startingStack,
      currentStack,
      currentBet,
      hasFolded
    }
  ]
}
```

### Reducer Actions

| Action | Description |
|---|---|
| `ADD_PLAYER` | Appends a new player with name and buy-in |
| `START_GAME` | Transitions to gameplay, fires game started events |
| `PLACE_BET` | Deducts from stack, increases player bet, updates pot |
| `CHECK` | No-op state update, fires analytics event |
| `FOLD` | Marks player as folded |
| `END_HAND` | Transitions to end hand screen |
| `AWARD_POT` | Adds pot to winner stack, transitions to hand complete screen |
| `NEXT_HAND` | Resets bets, pot, and folded states; increments hand number; returns to gameplay |

Analytics calls are triggered as side-effects of dispatch — not scattered through individual components.

---

## Component Structure

```
App                          ← holds reducer, provides dispatch via context
├── SetupScreen
│   ├── PlayerForm           ← name + buy-in inputs with inline validation
│   └── PlayerList           ← preview of added players; "Start Game" disabled < 2 players
├── GameplayScreen
│   ├── PotDisplay           ← prominent pot total, top of screen
│   ├── PlayerCard[]
│   │   ├── PlayerInfo       ← name, current stack, current bet
│   │   ├── ActionButtons    ← Check / Bet / Fold; hidden entirely when player is folded
│   │   └── BetInput         ← inline expand on "Bet" tap; shows amount input + Confirm / Cancel
│   └── EndHandButton        ← always accessible; triggers END_HAND
├── EndHandScreen
│   ├── PotSummary           ← pot total shown prominently
│   ├── WinnerSelector       ← radio-style list; only non-folded players selectable
│   └── AwardButton          ← disabled until a winner is selected
└── HandCompleteScreen       ← winner name + pot amount; updated stack list; "Start Next Hand"
```

---

## Analytics Event Map

All events match the spec in `prd.md` §13.

| Trigger point | Event | Key properties |
|---|---|---|
| App load | `game_setup_started` | — |
| `ADD_PLAYER` | `player_added` | `number_of_players` |
| `ADD_PLAYER` | `buy_in_added` | `player_stack` |
| `START_GAME` | `game_started` | `number_of_players` |
| Hand 1 start / `NEXT_HAND` | `hand_started` | `hand_number` |
| `NEXT_HAND` (hand 2+) | `second_hand_started` | — |
| `PLACE_BET` | `bet_placed` | `bet_amount`, `player_stack`, `hand_number` |
| `CHECK` | `check_selected` | `hand_number` |
| `FOLD` | `player_folded` | `hand_number` |
| `AWARD_POT` | `hand_completed` | `hand_number` |

---

## Input Validation

Matches validation rules in `user-flow-wireframes.md`.

| Input | Invalid condition | Behaviour |
|---|---|---|
| Player name | Empty | Inline error, blocks add |
| Buy-in amount | Empty, zero, negative, non-numeric | Inline error, blocks add |
| Start Game | Fewer than 2 players | "Start Game" button disabled |
| Bet amount | Empty, zero, negative, or above current stack | Inline error, blocks confirm |
| Winner selection | None selected | "Award Pot" button disabled |

---

## Screen & State Transitions

```
SETUP
  └─ [Start Game] ──────────────► GAMEPLAY (hand 1)
                                       │
                              [End Hand]│
                                       ▼
                                  END HAND
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

## Key Design Decisions

- **Bet entry:** Inline expand within the player card (per wireframe), not a modal
- **Check availability:** Available when the total pot is zero (no wager exists from any player in the current hand)
- **Folded players:** Card remains visible but greyed out; action buttons are hidden
- **End Hand confirmation:** A dedicated End Hand screen acts as confirmation before awarding the pot — prevents accidental awards
- **No routing library:** `screen` field in state drives which screen renders; no React Router needed at MVP scale
- **Pot calculation:** Pot is updated incrementally on each `PLACE_BET` dispatch, not recalculated from player bets on render

---

## Build Order

| Step | What gets built |
|---|---|
| 1 | Project scaffolding — Vite, Tailwind, Vercel config, `.env`, analytics wrapper |
| 2 | Reducer + state — all actions, transitions, initial state, analytics side-effects |
| 3 | SetupScreen — player form, validation, player list, Start Game |
| 4 | GameplayScreen shell — pot display, player cards (read-only, no actions yet) |
| 5 | ActionPanel — Check, Fold, Bet input with inline expand and validation |
| 6 | EndHandScreen — winner selection, Award Pot |
| 7 | HandCompleteScreen — winner summary, updated stacks, Start Next Hand |
| 8 | Analytics wiring — connect Mixpanel events through all actions |
| 9 | Mobile polish — Tailwind responsive pass, tap target sizing, visual fold state |

---

## Out of Scope for This Build

Do not implement unless explicitly requested:

- Betting rules enforcement (minimum bet, raise sizing, all-in constraints)
- Blind structure (levels, posting, dealer button, positions)
- Turn order or street progression
- Side pots or split pots
- Session or hand history
- Cross-device or multi-device support
