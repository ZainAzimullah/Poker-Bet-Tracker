# Product Requirements Document
## Poker Bet Tracker — Release 2

**Version:** 2.0  
**Status:** Ready for development  
**Informed by:** Post-MVP findings & recommendations

---

## 1. Overview

Release 2 combines what the roadmap called the Immediate Patch and Release 2 into a single release. The patch items ship first — they are correctness and friction fixes that should not wait — but the full release scope includes both layers.

The MVP validated the core loop. Users completed 6 hands per session on average, 100% played a second hand, and hand completion hit 75%. What the post-MVP review exposed was one tracked-state correctness issue, two features that users felt immediately as absent, and a set of structural gaps that will make the app feel like real poker rather than a bare tracker.

Release 2 fixes what's broken first, then adds the structure users are ready for.

---

## 2. What Informed This Release

**Bet input confusion caused mid-session restarts.** Users entered the total wager instead of the incremental amount — a natural assumption the UI did nothing to prevent. This corrupted the pot total mid-game and caused at least one session to be abandoned and restarted. It is the highest-priority fix in the release.

**A call action is missing and was felt by both respondents.** In heads-up play, the call amount is trivially computable from state the app already holds. Having users calculate and enter it manually is unnecessary overhead and an additional error surface.

**Blind and dealer tracking was raised independently by both respondents.** Not as a rules request — as a social coordination problem. After each hand, nobody remembers who deals next or who is small blind. One participant described it as something they really struggled with.

**Split pot is a correctness gap, not a missing feature.** When two players hold equivalent winning hands, the current end-hand flow cannot resolve the pot correctly — it only supports awarding the full amount to one player. Both respondents flagged this.

**Turn structure, betting streets, and rules enforcement were not blocking MVP usage** but represent the next expected layer of structure. Hand completion was at target without them; Release 2 adds them now that the core loop is proven.

Full analysis in `findings-and-recommendations.md`.

---

## 3. North Star Metric

**# poker hands completed per active user without physical chips**

Unchanged. Release 2 should push average hands per session above 6 and clean up the setup-to-gameplay conversion rate by eliminating the mid-session restarts caused by bet input confusion.

---

## 4. Success Metrics

| Goal | Metric | MVP Result | Release 2 Target |
|---|---|---|---|
| Clean setup conversion | % `game_setup_started` → `player_added` | 36%* | ≥ 80% |
| Bet input accuracy | Mid-session restarts due to input confusion | Observed | Zero |
| Core loop engagement | % started hands with 1+ bet placed | 100% | ≥ 85% (hold) |
| Core loop completion | % started hands completed | 75% | ≥ 80% |
| Engagement depth | Avg hands completed per active user | 6 | ≥ 6 (hold) |
| Early retention | % users completing a second hand | 100% | ≥ 60% (hold) |
| Call action adoption | % hands where Call is used | — | Baseline only |

*Explained by mid-session restarts from bet input confusion, not a setup UX problem. Fixing the bet input should bring this back to ≥ 80%.

---

## 5. Scope

Release 2 is grouped into two layers that ship in order. Layer 1 items do not depend on Layer 2 — they are self-contained and should be unblocked first.

---

### Layer 1 — Correctness & Friction Fixes

These address the post-MVP review findings directly. They require no Release 2 infrastructure and should ship as soon as they are ready.

#### 5.1 Bet input labelling and context

**Problem:** Users enter the total wager rather than the incremental amount. The UI provides no context to communicate the correct model.

**Solution:** Display the current maximum wager in the hand alongside the bet input field. Relabel the input to make clear it represents an amount to add, not the total wager. No logic changes required.

**Acceptance criteria:**
- Current maximum wager is visible adjacent to the bet input when a wager exists
- Input label communicates incremental entry (e.g. "Amount to add")
- A player making a raise can see the previous maximum wager and understands they are adding on top of their existing bet
- A player entering the first bet of a street sees no misleading context

#### 5.2 One-touch Call button

**Problem:** Users manually calculate and enter a call amount. This is avoidable overhead and a source of input errors — the app already holds all the information needed to compute it.

**Solution:** Add a Call button that calculates and applies the correct call amount in one tap. The call amount is the difference between the current maximum bet in the hand and the acting player's current bet. If the player's stack is less than the call amount, the button applies an all-in.

**Acceptance criteria:**
- Call button appears when a wager exists and the acting player has not yet matched it
- Tapping Call applies the correct amount without requiring user input
- If stack < call amount, applies the player's remaining stack
- Pot and stack update correctly
- Call button is not shown when the player has already matched the current wager or no wager exists

#### 5.3 Dealer and blind position display

**Problem:** Players have no shared reference for who is dealer, small blind, and big blind between hands. This is a social coordination problem — it slows the table and creates disagreement.

**Solution:** Display dealer (D), small blind (SB), and big blind (BB) indicators alongside player names on the gameplay screen. Roles rotate one position clockwise at the start of each new hand. No enforcement or configuration required at this layer — blind amounts and automatic posting are handled in 5.7.

**Acceptance criteria:**
- D, SB, and BB indicators are visible on the gameplay screen for the relevant players
- Roles rotate automatically at the start of each new hand
- Rotation is clockwise through the active player list
- A manual rotate option is available if the auto-rotation needs correction
- No configuration screen is required for this feature

#### 5.4 Split pot

**Problem:** When two players hold equivalent winning hands, the pot cannot be resolved correctly in the current end-hand flow — only a single winner can be selected. This is a correctness gap, not a missing convenience: ties are a regular occurrence in heads-up play.

**Solution:** Add a split pot option to the end-hand flow. When selected, the pot is divided equally between the nominated players, with each player's stack updated accordingly. If the pot is an odd amount, the remainder stays in the pot and is not distributed.

**Acceptance criteria:**
- End-hand flow offers a split option alongside single-winner selection
- Two or more players can be nominated to share the pot
- Each nominated player receives an equal share of the pot added to their stack
- Pot and bets reset correctly after a split, same as a single-winner award
- Odd-unit remainders are not distributed and are handled with a clear, simple rule

---

### Layer 2 — Structure & Rules

These features add the poker structure that was deliberately excluded from MVP. They can be sequenced by implementation complexity but should ship after Layer 1 is stable.

#### 5.5 Turn order and active player indicator

**Problem:** With no indication of whose turn it is, players coordinate verbally. This creates friction and occasional confusion about action order, especially with 3+ players.

**Solution:** Highlight the currently active player during a hand. Any action — check, bet, call, fold — advances the active state to the next non-folded player in clockwise sequence.

**Acceptance criteria:**
- One player is visually marked as active at any point during a hand
- Active player indicator is glanceable and prominent
- Any action advances the active state to the next non-folded player in clockwise order
- Folded players are skipped in turn progression
- A manual "next player" control is available as a fallback

#### 5.6 Betting street display and progression

**Problem:** There is no concept of pre-flop, flop, turn, and river in the current app. Users cannot tell where they are in a hand and the app cannot help structure progression.

**Solution:** Display the current betting street. Advance to the next street when all active players have acted and bets are equalised. Allow manual street advancement as a fallback.

**Acceptance criteria:**
- Current street (Pre-flop, Flop, Turn, River) is displayed during gameplay
- Street advances automatically when all active players have acted and bets are equal
- Manual street advancement is available if automatic logic does not trigger
- End hand flow remains accessible at any point regardless of current street

#### 5.7 Blind level configuration

**Problem:** Without a configurable big blind value, minimum bet enforcement (5.8) has no baseline. Users also need to agree on blind sizes before a game.

**Solution:** Add blind level fields to game setup. Small blind and big blind amounts are required before a game can start. These values inform minimum bet enforcement and are displayed alongside position indicators from 5.3. At the start of each hand, the configured SB and BB amounts are automatically deducted from the respective players' stacks and added to the pot — players do not need to enter them manually.

**Acceptance criteria:**
- Game setup includes fields for small blind and big blind amounts
- Both values are required before a game can start
- Big blind value is used as the minimum opening bet on each street
- Configured amounts are visible on the gameplay screen alongside position indicators
- At the start of each hand, the SB amount is deducted from the small blind player's stack and the BB amount from the big blind player's stack, with both amounts added to the pot automatically
- Automatic posting is skipped if a player's stack is less than the blind amount — their remaining stack is posted as a partial blind and they are treated as all-in
- The posted blind amounts are reflected in each player's current bet at the start of pre-flop, so the Call button and bet input logic work correctly from the first action

#### 5.8 Minimum bet enforcement

**Problem:** Without a minimum bet, users can enter any amount — including amounts below the big blind or the previous bet size. This creates situations that would not be legal in real play.

**Solution:** Enforce a minimum opening bet equal to the big blind (from 5.7) on the first bet of each street. Enforce a minimum raise equal to the size of the previous bet or raise in that street. Display the minimum in the bet input UI.

**Acceptance criteria:**
- Opening bet on a street cannot be less than the big blind
- A raise cannot be less than the size of the previous bet or raise in the street
- Minimum is displayed in the bet input UI when relevant
- Input below the minimum is blocked with an inline error stating the minimum

#### 5.9 All-in constraints

**Problem:** The MVP does not prevent a player from entering a bet that exceeds their current stack.

**Solution:** Cap bet and raise inputs at the player's current stack. Display the maximum available amount. The Call button from 5.2 already handles all-in on call — this covers bet and raise entries.

**Acceptance criteria:**
- Bet input is capped at the acting player's current stack
- Entering an amount above the stack is blocked with an inline error showing the available amount
- A player who goes all-in is visually marked and cannot act further in the hand

#### 5.10 Check prevention on existing wager

**Problem:** Check is not a legal action when an unmatched wager exists. The MVP allows it, which can produce incorrect pot states.

**Solution:** Disable the Check button when the acting player's current bet is less than the maximum bet in the hand. Keep the button visible but disabled to preserve layout consistency.

**Acceptance criteria:**
- Check is disabled when an unmatched wager exists for the active player
- Disabled state is visually distinct from the enabled state
- Check is enabled when no wager exists or the player has already matched the current maximum

---

## 6. Out of Scope for Release 2

**Side pots** — Arise only in multi-way all-in situations with different stack depths. Distinct from split pot and significantly more complex. Backlog.

**Raise-size enforcement beyond minimum** — Minimum raise is enforced (5.8). The additional rule that a re-raise must be at least the size of the previous raise increment is deferred. Backlog.

**Session and hand history** — Backlog.

**Player photos, templates, multi-device** — Backlog.

---

## 7. Analytics Additions

Extend the existing event set with:

| Event | Key Properties |
|---|---|
| `call_placed` | `call_amount`, `player_stack`, `hand_number` |
| `all_in_placed` | `player_stack`, `hand_number` |
| `split_pot_awarded` | `split_count`, `pot_amount`, `hand_number` |
| `street_advanced` | `street_name`, `hand_number` |
| `blind_config_set` | `small_blind`, `big_blind` |
| `check_blocked` | `hand_number` |

Track `call_placed` separately from `bet_placed` to measure Call button adoption and validate that manual call input errors are being reduced.

---

## 8. Open Questions

- Should blind rotation at hand start be automatic, or require a manual confirm tap? *(Recommendation: automatic, but show the new assignments clearly so the table can verify)*
- Does minimum bet enforcement apply on the very first bet pre-flop, before blind config is surfaced to the player mid-game? *(Resolve before implementing 5.8)*
- How should the UI communicate that blinds have been automatically posted at hand start — inline on each player card, a toast, or a summary above the pot? *(Resolve before implementing 5.7)*
