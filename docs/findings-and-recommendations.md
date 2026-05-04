# Findings & Recommendations Report
## Poker Bet Tracker — Post-MVP Review
## 1. Executive Summary

The MVP core loop is working. Users who complete setup go on to play hands at a healthy rate — 100% start a hand, 100% place a bet, and 75% complete it. Average session depth of 6 hands per active user is double the ≥3 target, and every user who finished a first hand came back for a second. The product is doing its core job.

The dominant issue emerging across both quantitative and qualitative data is a single, high-impact friction point: **the additive bet input model is not intuitive, and users are entering the wrong values as a result.** Follow-up investigation confirms this is also the root cause of the apparent setup drop-off in the funnel — users were not abandoning setup, they were restarting after discovering mid-game that their bets had been tracked incorrectly. This makes it the most urgent thing to fix.

Beyond that, two features are being felt as absent by both respondents: a one-touch call action, and some way to track who is dealer, small blind, and big blind. Both are worth pulling earlier than the current roadmap places them.

**Data Sources:**
- [Mixpanel Dashboard](https://mixpanel.com/p/65kHTYq3rAT8VAvK5Es1Q2)
- [Feedback survey (Google Form)](https://docs.google.com/forms/d/e/1FAIpQLSfEjYABmkLZCA-GHMYz_qO0tPQD1e-WqhakBQ-in3KlVz4qmA/viewform)
- [Survey responses (CSV)](survey-responses.csv)

---

## 2. Quantitative Findings (Mixpanel)

### Funnel Overview

| Step | Event | Users | Conversion |
|---|---|---|---|
| 1 | `game_setup_started` | 11 | — |
| 2 | `player_added` | 4 | 36% |
| 3 | `buy_in_added` | 4 | 100% |
| 4 | `game_started` | 4 | 100% |
| 5 | `hand_started` | 4 | 100% |
| 6 | `bet_placed` | 4 | 100% |
| 7 | `hand_completed` | 3 | **75%** ✅ |
| 8 | `second_hand_started` | 3 | **100%** ✅ |

### Metric Scorecard

| Metric | Target | Result | Status |
|---|---|---|---|
| % users adding players | ≥ 80% | 36% | — (see note) |
| % users starting 1+ hand | ≥ 70% | 100% (of completed setups) | ✅ |
| % started hands with 1+ bet | ≥ 85% | 100% | ✅ |
| % started hands completed | ≥ 75% | 75% | ✅ At target |
| Avg hands per active user | ≥ 3 | **6** | ✅ Exceeds |
| % users completing a second hand | ≥ 60% | 100% | ✅ Exceeds |

### On the setup drop-off

The funnel shows only 36% of users who triggered `game_setup_started` went on to add a player. On first read this looks like a significant setup UX problem. Follow-up investigation explains it differently: a participant confirmed they restarted the app mid-game after discovering that bets had been tracked incorrectly because they had been entering the total wager instead of the increment. Each restart would register a new `game_setup_started` event without a corresponding `player_added`, artificially inflating the apparent drop-off.

The 36% figure is therefore better understood as a signal of **bet input confusion causing mid-session restarts**, not a problem with the setup flow itself. The setup funnel from `player_added` onward is clean — 100% conversion at every step through to `game_started`. The setup screen does not need attention; the bet input does.

### Key observations

**Once committed, users complete the loop.** The funnel from `player_added` through `second_hand_started` is near-perfect. No meaningful drop-off occurs anywhere in gameplay or end-hand flows.

**Engagement depth significantly exceeds target.** Six hands per active user is strong evidence that users are trusting the tracked state enough to keep playing — the core emotional JTBD is being met for users who get past the bet input issue.

**Second-hand retention is 100%.** The hand reset flow and carry-over state are working. Users understand how to start another hand and confirm that stacks look right.

---

## 3. Qualitative Findings (Survey, n=2 + follow-up interview)

Both respondents played 2-player (heads-up) games and used all four core features: stack tracking, bet tracking, pot total, and pot award.

### Setup experience
Ratings: 3/5 and 5/5. The 5/5 came from a player who was not managing the app. The 3/5 from the primary user likely reflects frustration carried over from the bet input issue and the restart it caused, rather than a genuine problem with the setup screen — consistent with the funnel explanation above.

### Bet tracking experience
Both respondents rated bet tracking 4/5. This is notable: despite the confusion around the input model, the underlying tracking — once users understood how it worked — was rated positively. The problem is communicating the correct mental model, not the tracking logic itself.

### The bet input issue

This is the single most important finding in the dataset. The primary user noted:

> *Initially didn't realise that when inputting bets, it's additive, not the overall wager. For example, if an initial player has bet $2 and then another player raises to $4, then the initial player should input $2 to call the $4, and not input $4.*

Follow-up investigation confirmed this caused at least one mid-session restart, which accounts for the funnel anomaly noted above. The fact that this confused the person who built the app is a strong signal that any new user arriving without context will make the same mistake — entering incorrect values and getting a tracked state they cannot trust. This directly attacks the product's core promise.

### Manual call input

Both respondents independently flagged entering a call amount manually as friction. In a heads-up game the call amount is simply the difference between the two players' bets — a calculation the app already has all the information to perform. Having users do this themselves is unnecessary overhead and an additional error surface.

### Blind and dealer tracking

Both respondents raised this independently. One described it as something they *really struggled with* and came back to it in the closing question after the rest of the survey. The specific pain is not about rules enforcement — it is the social coordination problem of remembering who holds which role after each hand. Both mentioned it explicitly in their missing features list.

### Split pot

Both respondents flagged the absence of a split pot option, making it the third most consistently raised gap after blind/dealer tracking and the call button. The primary user was specific about the scenario:

> *Can't split pot when both players have the same winning hand.*

This is not a missing convenience feature — it is a correctness gap. In heads-up play, when both players hold equivalent winning hands, the pot must be divided equally. The current end-hand flow only supports awarding the full pot to one player, which means a tie cannot be resolved correctly within the app. Any user who encounters a split pot is forced to either estimate manually or exit the app to do the maths themselves, undermining the core promise of accurate tracking.

The second respondent echoed this: *"The ability to automate calls, all in, tracking big blind / small blind & splitting the pot."*

Unlike side pots — which only arise in multi-way all-in situations and add meaningful complexity — a split pot in heads-up play is a straightforward calculation (pot ÷ 2, distributed to both players) and a relatively frequent occurrence. It belongs in the same correctness tier as the bet input fix.

### Missing features (ranked by frequency)

| Feature | Respondents |
|---|---|
| Blind/dealer position tracking (who is SB/BB/button) | Both |
| Quick call action (one-touch) | Both |
| Split pot | Both |
| Automatic blind posting | 1 |
| All-in shortcut | 1 |

### Likelihood to use again
Ratings: 3/5 and 1/5. The 1/5 came from a passive participant who was not tracking the game. The 3/5 from the primary user is the more meaningful signal — the app is functional but not yet compelling enough to recommend without reservation. Resolving the bet input issue and adding a call action is likely to move this meaningfully.

---

## 4. Roadmap Assessment

### What the data confirms

The core MVP hypothesis holds. Users who get through setup play multiple hands, award pots correctly, and return for more. The tracking loop works and users trust it enough to continue. The decision to start with the main pot tracking problem before adding structure was correct — the hands-per-session metric (6 vs ≥3 target) validates it.

### What should change

#### 🔴 Fix before anything else: Additive bet input UX

This is not a Release 2 candidate — it is a correctness issue with the current MVP. When users enter the total wager instead of the increment, the tracked state is wrong. A wrong pot total is the opposite of what the product exists to provide, and it is causing users to restart sessions entirely.

The survey quote and the restart behaviour together make a clear case: the current UI does not communicate the input model, and users are defaulting to a reasonable but incorrect assumption. The fix does not require logic changes — it is a labelling and context problem. Displaying the current maximum wager alongside the input field, with a label like *Amount to add* rather than a bare input, would resolve it.

#### 🔴 Pull forward: One-touch Call button

Both respondents raised manual call entry as a specific frustration, independently and unprompted. This is the most consistently cited friction point in the qualitative data. A Call button is a self-contained addition: calculate the difference between the current maximum bet and the acting player's current bet, and apply it in one tap. It does not require turn order, blind enforcement, or any other Release 2 feature. It can ship alongside the bet input fix.

This matters more than its simplicity suggests. Manual call entry is not just friction — it is an additional error surface. Every time a user has to mentally calculate and enter a call amount, they risk entering the wrong value and corrupting the very state the product is supposed to maintain for them.

#### 🟡 Pull forward (lightweight): Blind/dealer position display

The roadmap places *Position blinds and button* in the backlog and blind configuration in Release 2. Both respondents flagged the absence of any dealer/blind tracking — not because they needed enforcement, but because they needed a shared reference point at the table. The pain is social coordination, not rules.

A minimal implementation — display of who is dealer, SB, and BB, with a rotate button at the end of each hand — is fully separable from blind level configuration and enforcement. It requires no betting logic and no configuration screen. It directly addresses what both users asked for, without pulling in Release 2 complexity.

**Recommendation:** Ship dealer/blind display as a lightweight addition in the same patch as the bet input and call fixes. Keep blind level configuration and automatic posting in Release 2 where they belong.

#### 🟢 Keep as planned: Turn order enforcement, betting streets, minimum bet

The survey does not show users failing to complete hands because of missing turn structure. Hand completion is at 75% — at target — without any enforcement. These features add structure and polish but are not currently blocking usage. They remain appropriate for Release 2.

#### 🔴 Pull forward: Split pot into Release 2

Both respondents raised split pot independently. More importantly, it is a correctness gap, not a missing feature: when two players hold equivalent winning hands, the pot cannot be accurately resolved within the current end-hand flow. Heads-up play is the most common configuration for this app's target user, and ties are a regular occurrence. A split pot for two players is a simple equal division — it requires no complex side-pot logic and can ship as part of Release 2.

Note the distinction from **side pots**, which remain in the backlog. Side pots only arise in multi-way all-in situations with different stack depths — significantly more complex and less frequently encountered in casual play. Split pots are the simpler, higher-impact problem to solve first.

#### 🟢 Keep in backlog: All-in shortcut

One respondent mentioned this. Legitimate future request, but not a blocker. Revisit if it surfaces consistently across more sessions and users.

---

## 5. Revised Roadmap Priority Order

```
IMMEDIATE (patch before Release 2)
────────────────────────────────────────────────────
- Fix additive bet input labelling and context
  (correctness issue — highest priority)
- Add one-touch Call button
- Add dealer/blind position display + rotate button
  (display only — no enforcement or configuration)

RELEASE 2 (updated)
────────────────────────────────────────────────────
- Blind level configuration
- Turn order and whose turn it is
- Betting street progression
- Minimum bet enforcement
- All-in constraints and blind posting
- Split pot (correctness gap — equal division for tied hands)

BACKLOG (unchanged)
────────────────────────────────────────────────────
- Side pots (multi-way all-in — distinct from split pot)
- All-in shortcut
- Automatic blind posting
- Session and hand history
- Multi-device support
- Side pots
```

---

## 6. Limitations

- Survey sample is small (n=2), both from the same session type (heads-up, 2 players). All findings are directional, not conclusive.
- Both respondents are known to the builder, which may introduce courtesy bias in ratings.
- The funnel anomaly (36% conversion from `game_setup_started` to `player_added`) is explained by mid-session restarts, but this interpretation rests on a single participant's follow-up account. Additional sessions would confirm whether this pattern recurs with new users.
- The 1/5 likelihood-to-use rating is from a passive participant and is not representative of the primary user experience.

