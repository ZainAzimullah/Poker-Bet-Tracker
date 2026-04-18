# CLAUDE.md

## Project
**Poker Bet Tracker**

A lightweight web app for tracking poker betting when physical chips are not available.

The app is primarily designed for casual, in-person poker sessions where players have a deck of cards but no chips. The MVP should help users run a game smoothly by tracking player stacks, bets, and the main pot during a hand.

---

## Product Goal

Help users play poker hands without physical chips by making bets, stacks, and pot totals easy to track.

### Core product outcome
- **# poker hands completed per active user without physical chips**

This is the main measure of whether the product is useful.

---

## Problem Statement

When people want to play poker without chips, they struggle to keep track of:
- each player's stack
- the bets already placed
- the total pot

This creates confusion, slows down the session, and reduces confidence that the game state is accurate.

---

## Jobs To Be Done

### Functional JTBD
Track bets in poker when physical chips are not available, so that the session runs smoothly.

### Emotional JTBD
Feel confident that pots, stacks, and bets are accurate.

### Social JTBD
Enjoy poker as a social activity without worrying about tracking mistakes.

---

## Target User

The initial target user is:
- casual poker players
- often playing informally with friends
- in-person
- without access to physical chips
- needing a fast and simple way to track betting

This is not a full poker engine for serious or competitive play in the MVP.

---

## Product Principles

1. **Fast to start**
   Users should be able to set up a game and begin a hand quickly.

2. **Simple over comprehensive**
   Prioritize smooth gameplay for the common case over perfect handling of all poker edge cases.

3. **Visible game state**
   The current pot, stacks, and bets should always be easy to understand.

4. **Low cognitive load**
   The interface should reduce mental math and memory burden.

5. **Accuracy builds trust**
   The app should make users feel confident that the tracked state is correct.

---

## MVP Scope

The MVP is focused on supporting the core loop of starting and completing a basic hand.

### MVP user flow
1. Add players
2. Add each player's buy-in amount
3. View current pot
4. View each player's stack
5. View each player's current bet
6. Let players act
7. End the hand
8. Award the pot to the winner
9. Start another hand

### MVP features

#### Setup
- Add player name
- Add player buy-in amount

#### Gameplay visibility
- Show pot value
- Show each player's stack
- Show each player's current bet

#### Actions
- Check when there is no current wager
- Place a bet
  - This action may also represent calling or raising in the MVP
- Fold

#### End hand
- Close the hand
- Add the pot value to the winner's stack

---

## MVP Definition

The MVP should solve this opportunity first:

> Users struggle to manage pots and payouts because they cannot remember how bets have been added.

More specifically, the MVP should address:
- tracking the main pot in a heads-up style flow
- making it easy to log bets and keep stacks updated
- reducing confusion during casual gameplay

### MVP solution statement
A simple interface that tracks each player's stack, logs bets, and automatically updates the main pot.

---

## Out of Scope for MVP

Do **not** build these in the first release unless explicitly requested later:

### Betting rules / constraints
- enforcing minimum bet
- enforcing raise sizing rules
- constraining all-in behaviour
- preventing illegal check/bet/call/raise combinations beyond basic guardrails
- showing full visual betting constraints

### Advanced poker structure
- blind levels
- small blind / big blind posting
- dealer button rotation
- player positions
- betting streets
- turn progression logic
- rotating blinds

### Advanced pot logic
- side pots
- multi-way all-in complexity
- split pots
- showdown resolution logic

### History / persistence
- session history
- hand history
- player history
- cross-device syncing
- templates
- player photos

The first version should be intentionally narrow.

---

## Release 2 Candidates

These are sensible next steps after MVP validation:

### Configuration
- configure blind levels
- configure maximum buy-in
- set max number of players

### Gameplay support
- show positions
- show current betting street
- show whose turn it is

### Rules enforcement
- enforce minimum bet
- constrain bets and raises to all-in when needed
- prevent checking when a wager exists
- progress to next player
- progress to next betting street

---

## Backlog / Future Ideas

- side pot support
- blind and button positioning
- seat positions
- betting history
- player history
- store past sessions
- multi-device support
- configuration templates
- player photos
- small blind / big blind enforcement
- rotate blinds automatically
- raise-size enforcement
- all-in shortcut

---

## UX Guidance

### General UX
- The UI should feel lightweight and mobile-friendly.
- Optimize for quick taps and glanceable information.
- Users should be able to understand the game state in a few seconds.

### Information hierarchy
The most important information on screen is:
1. current pot
2. player stacks
3. player bets
4. available actions

### Interaction design
- Keep actions obvious and low-friction.
- Avoid cluttering the interface with too many poker concepts in MVP.
- Prefer clear labels over poker jargon when possible.
- Reduce the chance of accidental input where it would affect stack or pot accuracy.

### Tone
- Practical
- Minimal
- Calm
- Trustworthy

---

## Suggested Screens

### 1. Game setup screen
Purpose:
- add players
- enter buy-in amounts
- start game

### 2. Main gameplay screen
Purpose:
- view pot
- view players
- view stacks
- view bets
- take actions

### 3. End hand flow
Purpose:
- select winner
- award pot
- reset current bets
- start next hand

---

## Functional Requirements

### Player setup
- Users can add one or more players.
- Each player must have a name.
- Each player must have a buy-in amount.
- The system stores a starting stack for each player.

### Gameplay state
- The system displays each player's current stack.
- The system displays each player's current bet in the hand.
- The system displays the total main pot.
- When a bet is entered, the player's stack decreases accordingly.
- When a bet is entered, the player's current bet increases accordingly.
- When a bet is entered, the main pot updates accordingly.

### Player actions
- A player can check when no current wager exists.
- A player can place a bet amount.
- A player can fold.
- Folded players should remain visually identifiable in the hand state.

### End hand
- A user can end the hand.
- A user can select the winner.
- The winner receives the full pot.
- After ending the hand:
  - player bets reset to zero
  - pot resets to zero
  - winner stack is updated
  - folded state is cleared for the next hand

---

## Non-Functional Requirements

- Responsive and usable on mobile
- Fast load time
- Clear state management
- Easy to extend later
- Basic input validation
- No unnecessary complexity in architecture

---

## Data Model Guidance

A simple initial model is fine.

### Suggested entities

#### Player
- id
- name
- startingStack
- currentStack
- currentBet
- hasFolded

#### Game
- id
- players[]
- pot
- status

#### Hand
- id
- playerStates
- pot
- winnerId
- status

Do not overengineer the schema for future poker variants yet.

---

## Edge Cases to Handle in MVP

Handle these sensibly:
- empty player name
- invalid buy-in amount
- negative or zero bet amounts
- bet greater than current stack unless explicitly allowing all-in
- ending a hand without selecting a winner
- resetting per-hand values correctly after hand completion

Do not try to fully solve complex tournament or casino-grade rules yet.

---

## Metrics to Support

Instrument the app so these can be measured later.

### Product metrics
- % users completing 1+ poker hand
- # poker hands completed per active user
- % users who complete a second hand

### Feature metrics
- % users adding players
- % started hands with at least 1 bet placed

### Success targets
- **≥ 80%** of users add players
- **≥ 70%** of users start at least 1 hand
- **≥ 85%** of started hands have at least 1 bet placed
- **≥ 75%** of started hands are completed
- **≥ 3** average poker hands completed per active user
- **≥ 60%** of users complete a second hand

These metrics are meant to validate the core behaviour before investing in more advanced features.

---

## Suggested Events

Track events such as:
- `game_setup_started`
- `player_added`
- `buy_in_added`
- `game_started`
- `hand_started`
- `bet_placed`
- `check_selected`
- `player_folded`
- `hand_completed`
- `second_hand_started`

Useful event properties may include:
- number_of_players
- bet_amount
- player_stack
- hand_number

Keep tracking simple and practical.

---

## Engineering Guidance for Claude

When generating code for this project:

1. Build the simplest architecture that cleanly supports the MVP.
2. Prioritize clarity and maintainability over cleverness.
3. Keep components modular, especially around:
   - setup
   - player state
   - pot calculation
   - hand reset
4. Avoid implementing advanced poker rules unless explicitly asked.
5. Make sensible UX decisions that reduce user confusion.
6. Validate important numeric inputs.
7. Keep state transitions predictable and easy to debug.
8. Default to clean, minimal styling.

---

## What Good Looks Like

A successful MVP should let a small group of friends:
- quickly set up a game
- log bets without chips
- always understand the current pot and stacks
- finish a hand with confidence
- immediately start another hand

If the app achieves that reliably, the MVP is doing its job.

---

## What to Avoid

Avoid turning this into:
- a full poker simulator
- a rule-complete tournament engine
- a statistics-heavy product
- an overbuilt system designed for future possibilities instead of current needs

The first goal is simple, trustworthy hand tracking.

---

## Summary for Claude

Build a **simple, mobile-friendly poker bet tracker** for casual in-person games without physical chips.

The MVP should:
- let users add players and buy-ins
- show stacks, bets, and pot clearly
- support basic actions like check, bet, and fold
- allow users to end a hand and award the pot
- make repeated hand play easy

Do **not** prioritize advanced poker logic yet. Focus on usability, clarity, and confidence in the tracked state.
