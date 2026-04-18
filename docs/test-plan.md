# Lightweight Test Plan
## Poker Bet Tracker — MVP

---

## Purpose

This test plan is designed to validate the MVP before investing in Release 2 features. It focuses on two questions:

1. Can users set up a game and complete a hand without confusion or errors?
2. Does the app give users enough confidence in the tracked state to keep playing?

---

## Test Approach

**Method:** Moderated usability observation  
**Format:** In-person, informal — watch friends or colleagues use the app during an actual or simulated poker session  
**Session length:** ~20–30 minutes  
**Participants:** 3–6 people per session (ideally a group that would actually play poker together)  
**Number of sessions:** 2–3 sessions before drawing conclusions

No formal lab setup required. The goal is to observe real usage friction, not collect statistically significant data at this stage.

---

## Hypotheses

These map directly to the MVP success metrics.

| # | Hypothesis | Success condition |
|---|---|---|
| H1 | Users can add players and buy-ins without needing help | ≥ 80% complete setup unaided |
| H2 | Users understand the gameplay screen well enough to start a hand | ≥ 70% start a hand without confusion |
| H3 | At least one bet is placed in most hands | ≥ 85% of hands include a bet |
| H4 | Users can complete a hand and award the pot correctly | ≥ 75% of started hands are completed |
| H5 | Users want to — and successfully do — play a second hand | ≥ 60% play a second hand |
| H6 | Users trust that pot and stack values are correct throughout | Qualitative — no expressed doubt about accuracy |

---

## Test Tasks

Give participants these prompts in order. Do not offer help unless they are completely stuck.

### Task 1 — Set up a game
> "You and your friends want to play a few hands of poker. Use this app to set everyone up with a starting amount."

**Watch for:**
- Do they find the add player flow immediately?
- Do they know what "buy-in" means in this context?
- Do they try to start the game before adding enough players?

**Pass criteria:** Player names and buy-ins added, game started, without needing guidance.

---

### Task 2 — Play through a hand
> "Play a hand. Have each player do something — bet, check, or fold — as you would in a real game."

**Watch for:**
- Do they understand what each action button does?
- Do they check the pot total during the hand?
- Do they notice stacks updating when bets are placed?
- Is there any moment of confusion about whose bet is whose?

**Pass criteria:** At least one bet placed, pot updates correctly, no expressed confusion about game state.

---

### Task 3 — End the hand
> "The hand is over. Wrap it up and award the pot to whoever won."

**Watch for:**
- Do they find "End Hand" without prompting?
- Do they understand the winner selection screen?
- Do they notice the stack update after awarding?
- Any hesitation before confirming?

**Pass criteria:** Winner selected and pot awarded correctly, updated stacks visible and understood.

---

### Task 4 — Start another hand
> "Play another hand."

**Watch for:**
- Do they know how to start the next hand?
- Do they check that stacks carried over correctly?
- Any confusion about state from the previous hand?

**Pass criteria:** Second hand started without confusion, players confirm stacks look right.

---

## Observation Checklist

Use this during each session.

### Setup
- [ ] Player add flow discovered without help
- [ ] Buy-in field understood
- [ ] Validation error triggered and handled (if applicable)
- [ ] Game started successfully

### Gameplay
- [ ] Pot value noticed and checked during hand
- [ ] Bet placed successfully
- [ ] Stack updated visibly after bet
- [ ] Fold used and folded player visually clear
- [ ] No expressed confusion about game state
- [ ] No accidental actions (mis-taps, wrong player)

### End hand
- [ ] "End Hand" found without prompting
- [ ] Winner selection understood
- [ ] Pot awarded correctly
- [ ] Stack update noticed and trusted

### Repeat play
- [ ] Second hand started without friction
- [ ] Carry-over state understood

---

## Exit Interview Questions

After the session, ask a few short questions:

1. Was there any moment where you weren't sure what the app was tracking?
2. Did you feel confident that the pot and stacks were correct?
3. Was there anything confusing or missing?
4. Would you use this instead of trying to track it in your head?

---

## What to Do With Results

### If MVP hypotheses are met (≥ targets across sessions):
Proceed to Release 2 planning. Prioritise features that came up repeatedly in exit interviews.

### If core loop completion falls below 75%:
Investigate where hands are being abandoned. Is it the end hand flow? Action confusion? Investigate before adding new features.

### If bet placement falls below 85%:
The bet action may be unclear or too high friction. Review the bet entry UX before iterating on anything else.

### If users express doubt about accuracy:
This directly undermines the emotional JTBD. Prioritise visual feedback on state changes (stack and pot updates) before anything else.

### If second hand rate falls below 60%:
The hand reset flow may be broken or confusing. Confirm state is carrying over correctly and that the transition back to gameplay is obvious.

---

## Metrics Collection

Until formal analytics are instrumented, capture these manually during sessions:

| Metric | How to capture |
|---|---|
| % users adding players | Observation |
| % users starting a hand | Observation |
| % hands with 1+ bet | Tally per hand |
| % hands completed | Tally per hand |
| Hands per session | Count |
| Second hand rate | Observation |
