# Poker Bet Tracker

A lightweight mobile web app for tracking poker bets, stacks, and pots during casual in-person games — no physical chips required.

![Poker Bet Tracker app demo](docs/images/demo.png)

---

## The Problem

Playing poker without chips means someone has to mentally track every player's stack, every bet placed, and the running pot. It's error-prone, slows the game down, and erodes trust that the numbers are right.

Poker Bet Tracker replaces that mental overhead with a simple, always-visible interface anyone at the table can glance at and trust.

---

## Product Demo

https://poker-bet-tracker.vercel.app/

---

## Features (MVP)

- Add players and set starting stacks via buy-in
- Live pot total that updates as bets are placed
- Per-player stack and current bet always visible
- Actions: **Check**, **Bet** (covers call/raise), **Fold**
- End hand flow — select winner, award pot, reset for next hand
- Repeatable — stacks carry over between hands

---

## Product Documentation

This project was scoped and designed using a full PM workflow before any code was written. The artefacts are included in this repo as a case study in product thinking.

| Artefact | Description |
|---|---|
| [`prd.md`](./docs/prd.md) | Full product requirements document — problem, JTBD, scope, metrics, functional requirements |
| [`user-flow-wireframes.md`](./docs/user-flow-wireframes.md) | User flow diagram and annotated lo-fi wireframes for all three screens |
| [`roadmap.md`](./docs/roadmap.md) | Release strategy — MVP, Release 2 candidates, backlog, and decision checkpoints |
| [`test-plan.md`](./docs/test-plan.md) | Lightweight usability test plan with hypotheses tied to success metrics |

### Product Artefacts

| Artefact | Preview |
|---|---|
| Metrics Tree | ![Metrics Tree](./docs/metrics_tree.png) |
| Jobs To Be Done | ![Jobs To Be Done](./docs/jobs_to_be_done.png) |
| Opportunity-Solution Tree | ![Opportunity-Solution Tree](./docs/opportunity_solution_tree.png) |
| MVP Success Metrics | ![Success Metrics](./docs/success_metrics.png) |
| Story Map | ![Story Map](./docs/story_map.png) |

---

## North Star Metric

**# poker hands completed per active user without physical chips**

### MVP Success Targets

| Goal | Metric | Target |
|---|---|---|
| Users start a game | % users who add players | ≥ 80% |
| Users begin gameplay | % users who start 1+ hand | ≥ 70% |
| Core loop engagement | % started hands with 1+ bet placed | ≥ 85% |
| Core loop completion | % started hands completed | ≥ 75% |
| Engagement depth | Avg hands completed per active user | ≥ 3 |
| Early retention | % users who complete a second hand | ≥ 60% |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React (Vite) |
| Styling | Tailwind CSS |
| State management | React state / useReducer |
| Backend | None — client-side only |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Run locally

```bash
git clone https://github.com/your-username/poker-bet-tracker.git
cd poker-bet-tracker
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

Output is in the `/dist` folder.

---

## Deployment

Deployed via Vercel. Every push to `main` triggers an automatic deployment.

---

## Roadmap

**MVP** — Core tracking loop (this release)

**Release 2** — Blind config, turn order, betting street progression, rules enforcement

**Backlog** — Side pots, session history, multi-device, seat positions

See [`roadmap.md`](./docs/roadmap.md) for full detail and the conditions that unlock each release.

---

## Out of Scope (MVP)

This is not a full poker simulator. The MVP deliberately excludes:

- Blind levels and blind posting
- Turn order enforcement
- Minimum bet / raise-size rules
- Side pots and split pots
- Session history and persistence

These are Release 2 and backlog candidates, not oversights.

---

## About This Project

Poker Bet Tracker is a personal side project built to solve a real problem and serve as a product management case study. The PM workflow — problem framing, opportunity-solution tree, story mapping, metrics definition — was completed before development began.
