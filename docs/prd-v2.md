# Product Requirements Document
## Poker Bet Tracker — Release 2

**Version:** 2.1  
**Status:** As implemented (Release 2 + enforcement patch — see `implementation-plan-v2-bug-fixes.md`)  
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

**Split pot was a correctness gap in MVP** — the end-hand flow only supported a single winner. **Release 2** adds split-pot awarding; **`hand_completed`** and **`split_pot_awarded`** cover tied resolutions in analytics.

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

**Problem:** Users naturally think in terms of **total** chips committed on a street, while an ambiguous “add more” model led some to enter values that corrupted the pot.

**Solution (as shipped):** The voluntary bet flow uses **total wager for the current street** (`targetStreetBet`). The reducer derives the chip **increment** from the acting player’s current street bet and updates the pot correctly. The UI uses short labels **Raise to:** (when facing a wager) or **Bet to:** (when opening the action post-flop), plus a single **Minimum: $X** line derived from blind size and raise rules. Inline validation blocks illegal totals.

**Acceptance criteria:**
- The player enters a **total** amount for the street (not a separate mental “delta” layer in the UI)
- Minimum legal total is visible when opening the bet panel
- Raises and opens are rejected below the minimum with a clear error (unless going all-in for less than the full minimum raise, which is allowed — see 5.8)
- Pot and stacks stay consistent with the entered total and stack cap

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

**Solution:** Display **DEALER**, **SMALL BLIND**, and **BIG BLIND** tags alongside player names on the gameplay screen. On **setup**, the same tags (and stack) appear next to each player so the table can align the phone with the table before **Start game**. The dealer button advances automatically at **Start next hand** (including heads-up stagger rules). **Manual dealer adjustment is only on the setup screen** (`Rotate dealer`) — not during active gameplay, so mid-hand coordination cannot desync enforced turn order.

**Acceptance criteria:**
- Role tags are visible on the gameplay screen for the relevant players
- Role tags are visible on setup for the current `dealerIndex` (with SB/BB derived from configured blind rules)
- Roles advance automatically when a new hand starts (`NEXT_HAND`); rotation skips **busted-out** seats (players with $0 who are out for subsequent hands)
- A **Rotate dealer** control exists on setup only (two or more players)
- Blind amounts and automatic posting are handled in 5.7

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

**Solution:** Highlight the currently **active** player during a hand. Only that player’s actions change state; others are ignored (with analytics for invalid attempts). Valid actions advance to the next eligible seat (not folded, not all-in, not busted out of the session).

**Acceptance criteria:**
- One player is visually marked as active at any point during a hand (when action is pending)
- Active player indicator is glanceable and prominent
- Check, bet, call, and fold advance turn order correctly; folded, all-in, and busted-out seats are skipped
- **No manual “next player” control** — order is fully enforced (removes advisory bypass that could desync state)

#### 5.6 Betting street display and progression

**Problem:** There is no concept of pre-flop, flop, turn, and river in the current app. Users cannot tell where they are in a hand and the app cannot help structure progression.

**Solution:** Display the current betting street. When a round closes legally, the app sets a **blocking prompt** (e.g. deal the flop / turn / river). The user physically deals the board cards, then taps **OK** to confirm — only then does `currentStreet` advance. There is **no separate manual “skip to next street” bypass** that could skip betting closure.

**Acceptance criteria:**
- Current street (Pre-flop, Flop, Turn, River) is displayed during gameplay
- The next street does not begin until betting is closed **and** the user confirms the street-change modal after dealing cards
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
- Opening bet on a street cannot be less than the big blind (unless the player is all-in for less)
- A raise cannot be less than the minimum raise increment derived from the previous raise size and big blind, **except** a **short all-in raise**: if the player’s entire remaining stack is insufficient for a full minimum raise, going all-in for less is allowed
- Minimum is displayed in the bet input UI when relevant (e.g. **Minimum: $X**)
- Input below the minimum is blocked with an inline error stating the minimum (when not all-in for the short-raise case)

#### 5.9 All-in constraints

**Problem:** The MVP does not prevent a player from entering a bet that exceeds their current stack.

**Solution:** Cap bet and raise inputs at the player's current stack. Display the maximum available amount. The Call button from 5.2 already handles all-in on call — this covers bet and raise entries.

**Acceptance criteria:**
- Bet input is capped at the acting player's current stack
- Entering an amount above the stack is blocked with an inline error showing the available amount
- A player who goes all-in is visually marked and cannot act further in the hand

#### 5.10 Check prevention on existing wager

**Problem:** Check is not a legal action when an unmatched wager exists. The MVP allows it, which can produce incorrect pot states.

**Solution:** Disable the Check button when the acting player's current bet is less than the maximum bet in the hand. **Preflop:** only the **big blind** may check, and only when there has been no raise (`maxBet` still equals the big blind). Keep the button visible but disabled where appropriate for layout consistency.

**Acceptance criteria:**
- Check is disabled when an unmatched wager exists for the active player
- Disabled state is visually distinct from the enabled state
- Post-flop: Check is enabled when there is no wager on the street or the player has matched the current maximum
- Preflop: Check is only available to the BB when unraised; other seats use Call / Raise / Fold as appropriate

#### 5.11 Busted-out players (session convenience)

**Not in the original PRD narrative** but shipped with enforcement: after a hand, a player at **$0** may be marked **busted out** for the rest of the session. Their tile stays visible (greyed); they are excluded from later hands, blind rotation, and turn order. Illegal actions from busted seats emit **`busted_action_blocked`**.

---

## 6. Out of Scope for Release 2

**Side pots** — Arise only in multi-way all-in situations with different stack depths. Distinct from split pot and significantly more complex. Backlog.

**Raise-size enforcement beyond the shipped minimum** — Release 2 enforces **minimum** open (big blind) and **minimum raise** (previous raise increment vs big blind) with a **short all-in** exception (5.8). Further subtleties (e.g. reopening action, cap games, multi-step “full bet” rules) are not tournament-complete. Backlog as needed.

**Session and hand history** — Backlog.

**Player photos, templates, multi-device** — Backlog.

---

## 7. Analytics

Events only reach Mixpanel when **`VITE_MIXPANEL_TOKEN`** is set at build time (see `analytics.js`).

**Existing / app-level**

| Event | Key properties |
|---|---|
| `game_setup_started` | (from `App.jsx` on load) |

**Reducer (`reducer.js`) — core gameplay**

| Event | Key properties |
|---|---|
| `player_added` | `number_of_players` |
| `buy_in_added` | `player_stack` |
| `blind_config_set` | `small_blind`, `big_blind` |
| `game_started` | `number_of_players` |
| `hand_started` | `hand_number` |
| `second_hand_started` | `hand_number` (e.g. `2` when the second hand begins) |
| `bet_placed` | `bet_amount` (chip **increment** to pot), `player_stack`, `hand_number` |
| `call_placed` | `call_amount`, `player_stack`, `hand_number` |
| `all_in_placed` | `player_stack`, `hand_number` |
| `check_selected` | `hand_number`; optional `auto_sole_actor: true` (auto pass when only one player can bet and no call is owed) |
| `player_folded` | `hand_number` |
| `hand_completed` | `hand_number`; if split: `split_pot: true`, `split_count` |
| `split_pot_awarded` | `split_count`, `pot_amount`, `hand_number` |
| `street_prompt_shown` | `next_street`, `hand_number` |
| `street_confirmed` | `next_street`, `hand_number` |
| `street_advanced` | `street_name`, `hand_number` |
| `turn_violation_attempt` | `action_type`, `hand_number` |
| `all_in_action_blocked` | `action_type`, `hand_number` |
| `busted_action_blocked` | `action_type`, `hand_number` |
| `dealer_rotate_blocked` | `screen` |
| `fold_blocked` | `reason` (`no_wager` \| `no_call_required`), `hand_number` |

Track `call_placed` separately from `bet_placed` for Call adoption. **`hand_completed`** fires for both single-winner and split-pot awards.

---

## 8. Resolved product decisions (formerly open questions)

- **Blind / button rotation:** Automatic on each new hand; **setup** shows DE/SB/BB tags and allows **Rotate dealer** before **Start game**. Gameplay does not allow rotating the button mid-hand.
- **Minimum bet preflop:** Big blind and posting come from setup (5.7); enforcement uses configured blinds.
- **Blinds posted at hand start:** Shown **inline** on player cards (stack, current bet, role tags) and pot total updates.
