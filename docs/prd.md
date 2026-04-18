# Product Requirements Document
## Poker Bet Tracker

**Version:** 1.0 — MVP  
**Status:** Ready for development  
**Author:** [Your name]

---

## 1. Overview

Poker Bet Tracker is a lightweight mobile web app for casual poker players who want to run a game without physical chips. It replaces the mental overhead of tracking stacks, bets, and pots with a simple, always-visible interface that anyone at the table can glance at and trust.

---

## 2. Problem Statement

When people play poker without chips, they struggle to keep track of each player's stack, the bets already placed, and the total pot. This creates confusion mid-hand, slows the session down, and erodes confidence that the game state is accurate — which undermines the whole experience.

---

## 3. Target User

Casual poker players playing informally with friends, in-person, without chips. They have a deck of cards and a phone. They are not competitive or tournament players — they want a fast, trustworthy way to keep the game moving.

---

## 4. Jobs To Be Done

| Type | Job |
|---|---|
| **Functional** | Track bets in poker when physical chips are not available, so the session runs smoothly |
| **Emotional** | Feel confident that pots, stacks, and bets are accurate |
| **Social** | Enjoy poker as a social activity without worrying about tracking mistakes |

The deeper be-goal: *be an active poker player* — the app removes a practical blocker to playing at all.

---

## 5. Opportunity

This project addresses the most foundational problem in the opportunity space:

> "I struggle to manage pots and payouts because I can't remember how bets have been added."

Specifically, the MVP targets the sub-opportunity of tracking the main pot in a heads-up or small group flow. Side pot complexity, blind structures, and turn progression are explicitly deferred.

A secondary opportunity — helping players remember betting constraints like current wager and minimum raise — is acknowledged but intentionally out of scope for MVP.

---

## 6. Product Principles

1. **Fast to start** — Setup should take under a minute.
2. **Simple over comprehensive** — Optimise for the common case, not edge cases.
3. **Visible game state** — Pot, stacks, and bets should be glanceable at all times.
4. **Low cognitive load** — Reduce mental math and memory burden.
5. **Accuracy builds trust** — The tracked state must feel reliable.

---

## 7. North Star Metric

**# poker hands completed per active user without physical chips**

This measures whether the app is actually useful in context, not just opened.

---

## 8. Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Users start a game | % users who add players | ≥ 80% |
| Users begin gameplay | % users who start 1+ hand | ≥ 70% |
| Core loop engagement | % started hands with at least 1 bet placed | ≥ 85% |
| Core loop completion | % started hands that are completed | ≥ 75% |
| Engagement depth | Avg poker hands completed per active user | ≥ 3 |
| Early retention | % users who complete a second hand | ≥ 60% |

These targets are designed to validate chip-free tracking as a behaviour before investing in more advanced features.

---

## 9. MVP Scope

### In scope

#### Setup
- Add player name
- Add player buy-in amount (becomes starting stack)

#### Gameplay visibility
- Display total pot
- Display each player's current stack
- Display each player's current bet for the active hand

#### Player actions
- **Check** — available when no current wager exists
- **Bet** — enter a bet amount; also represents call or raise in MVP
- **Fold** — removes player from hand; visually distinguishable

#### End hand
- Select a winner from active players
- Award full pot to winner (stack updated)
- Reset bets and pot for next hand
- Clear folded state

### Out of scope for MVP

**Betting rules and constraints**
Minimum bet enforcement, raise sizing rules, all-in constraints, illegal action prevention.

**Advanced poker structure**
Blind levels, blind posting, dealer button, player positions, betting streets, turn order logic.

**Advanced pot logic**
Side pots, multi-way all-in, split pots, showdown resolution.

**History and persistence**
Session history, hand history, player history, cross-device syncing, templates, player photos.

---

## 10. User Flow

1. Open app → Game setup screen
2. Add players with names and buy-in amounts
3. Start game → Gameplay screen
4. View pot, stacks, and bets
5. Players take actions (check / bet / fold)
6. End hand → Select winner
7. Pot awarded → Bets and pot reset
8. Start next hand (return to step 4)

---

## 11. Functional Requirements

### Player setup
- Users can add one or more players
- Each player requires a name and a buy-in amount
- Buy-in becomes the player's starting stack

### Gameplay state
- System displays each player's current stack
- System displays each player's current bet in the hand
- System displays the total main pot
- When a bet is placed: player stack decreases, player bet increases, pot updates

### Player actions
- A player can check when no current wager exists
- A player can place a bet by entering an amount
- A player can fold; folded state is visually identifiable throughout the hand

### End hand
- User can end the hand at any point
- User selects the winner from the active (non-folded) players
- Winner receives the full pot value added to their stack
- On hand completion: bets reset to zero, pot resets to zero, folded states clear

### Input validation
- Empty player name: blocked with inline error
- Invalid or missing buy-in: blocked with inline error
- Negative or zero bet: blocked
- Bet greater than current stack: blocked (all-in not supported in MVP)
- Ending hand without selecting a winner: blocked

---

## 12. Non-Functional Requirements

- Responsive and usable on mobile (primary form factor)
- Fast load time — no perceptible delay for a simple session
- Clear, predictable state management
- Basic input validation throughout
- Architecture easy to extend for Release 2 features

---

## 13. Analytics Instrumentation

### Events to track

| Event | Key Properties |
|---|---|
| `game_setup_started` | — |
| `player_added` | `number_of_players` |
| `buy_in_added` | `player_stack` |
| `game_started` | `number_of_players` |
| `hand_started` | `hand_number` |
| `bet_placed` | `bet_amount`, `player_stack`, `hand_number` |
| `check_selected` | `hand_number` |
| `player_folded` | `hand_number` |
| `hand_completed` | `hand_number` |
| `second_hand_started` | — |

---

## 14. Release Roadmap Summary

| Release | Focus |
|---|---|
| **MVP** | Core tracking loop — players, stacks, bets, pot, end hand |
| **Release 2** | Betting structure — blind config, turn order, street progression, rules enforcement |
| **Backlog** | Side pots, history, multi-device, seat positions, player photos |

Full detail in `roadmap.md`.

---

## 15. Open Questions

- Should the app support more than 2 players in MVP, or target heads-up first? *(Current stance: support multiple players but do not enforce turn order)*
- Should folded players be hidden or just greyed out? *(Current stance: visible but visually distinct)*
- Is a confirmation step needed before ending a hand? *(Recommended: yes, to prevent accidental pot awards)*
