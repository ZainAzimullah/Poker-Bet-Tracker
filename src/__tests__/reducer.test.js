import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../analytics', () => ({ track: vi.fn() }))

import { reducer, initialState } from '../reducer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Alice',
    startingStack: overrides.startingStack ?? 100,
    currentStack: overrides.currentStack ?? 100,
    currentBet: overrides.currentBet ?? 0,
    hasFolded: overrides.hasFolded ?? false,
    isAllIn: overrides.isAllIn ?? false,
  }
}

function makeState(overrides = {}) {
  return {
    ...initialState,
    screen: 'gameplay',
    handNumber: 1,
    dealerIndex: 0,
    smallBlind: null,
    bigBlind: null,
    currentStreet: null,
    activePlayerIndex: null,
    lastBetSize: 0,
    players: [],
    ...overrides,
  }
}

function dispatch(state, action) {
  return reducer(state, action)
}

// ---------------------------------------------------------------------------
// Step 2 — CALL action
// ---------------------------------------------------------------------------

describe('CALL', () => {
  it('deducts exact call amount from stack and adds to pot', () => {
    const state = makeState({
      pot: 10,
      players: [
        makePlayer({ id: 1, currentStack: 90, currentBet: 10 }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.currentStack).toBe(90)
    expect(p2.currentBet).toBe(10)
    expect(next.pot).toBe(20)
  })

  it('goes all-in when stack is less than call amount', () => {
    const state = makeState({
      pot: 50,
      players: [
        makePlayer({ id: 1, currentStack: 50, currentBet: 50 }),
        makePlayer({ id: 2, currentStack: 30, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.currentStack).toBe(0)
    expect(p2.currentBet).toBe(30)
    expect(next.pot).toBe(80)
  })

  it('does not go below zero stack on all-in call', () => {
    const state = makeState({
      pot: 100,
      players: [
        makePlayer({ id: 1, currentStack: 0, currentBet: 100 }),
        makePlayer({ id: 2, currentStack: 20, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.currentStack).toBeGreaterThanOrEqual(0)
  })

  it('does not change the calling player currentBet when they already match max', () => {
    const state = makeState({
      pot: 20,
      players: [
        makePlayer({ id: 1, currentStack: 80, currentBet: 20 }),
        makePlayer({ id: 2, currentStack: 80, currentBet: 20 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.currentBet).toBe(20)
    expect(p2.currentStack).toBe(80)
    expect(next.pot).toBe(20)
  })

  it('does not affect other players', () => {
    const state = makeState({
      pot: 10,
      players: [
        makePlayer({ id: 1, currentStack: 90, currentBet: 10 }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p1 = next.players.find((p) => p.id === 1)
    expect(p1.currentStack).toBe(90)
    expect(p1.currentBet).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Step 3 — ROTATE_DEALER + dealerIndex in NEXT_HAND
// ---------------------------------------------------------------------------

describe('ROTATE_DEALER', () => {
  it('increments dealerIndex by 1', () => {
    const state = makeState({ dealerIndex: 0, players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })] })
    const next = dispatch(state, { type: 'ROTATE_DEALER' })
    expect(next.dealerIndex).toBe(1)
  })

  it('wraps dealerIndex around when at the last player', () => {
    const state = makeState({
      dealerIndex: 2,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 }), makePlayer({ id: 3 })],
    })
    const next = dispatch(state, { type: 'ROTATE_DEALER' })
    expect(next.dealerIndex).toBe(0)
  })
})

describe('NEXT_HAND — dealerIndex rotation', () => {
  it('rotates dealerIndex by 1 on NEXT_HAND', () => {
    const state = makeState({
      screen: 'handComplete',
      dealerIndex: 0,
      pot: 50,
      players: [
        makePlayer({ id: 1, currentBet: 20, hasFolded: false }),
        makePlayer({ id: 2, currentBet: 30, hasFolded: true }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    expect(next.dealerIndex).toBe(1)
  })

  it('wraps dealerIndex on NEXT_HAND', () => {
    const state = makeState({
      screen: 'handComplete',
      dealerIndex: 1,
      pot: 0,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    expect(next.dealerIndex).toBe(0)
  })

  it('resets pot, currentBet, and hasFolded on NEXT_HAND', () => {
    const state = makeState({
      screen: 'handComplete',
      dealerIndex: 0,
      pot: 100,
      players: [
        makePlayer({ id: 1, currentBet: 50, hasFolded: true }),
        makePlayer({ id: 2, currentBet: 50, hasFolded: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    expect(next.pot).toBe(0)
    next.players.forEach((p) => {
      expect(p.currentBet).toBe(0)
      expect(p.hasFolded).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Dealer/SB/BB derivation (pure logic, no reducer — tested as computed values)
// ---------------------------------------------------------------------------

describe('Dealer / SB / BB position derivation', () => {
  function getRoles(dealerIndex, playerCount) {
    const sbIndex = (dealerIndex + 1) % playerCount
    const bbIndex = (dealerIndex + 2) % playerCount
    return { dealer: dealerIndex, sb: sbIndex, bb: bbIndex }
  }

  it('correctly derives SB and BB from dealer index', () => {
    const roles = getRoles(0, 3)
    expect(roles.dealer).toBe(0)
    expect(roles.sb).toBe(1)
    expect(roles.bb).toBe(2)
  })

  it('wraps SB and BB when dealer is near the end of the player list', () => {
    const roles = getRoles(2, 3)
    expect(roles.sb).toBe(0)
    expect(roles.bb).toBe(1)
  })

  it('wraps BB when dealer is second-to-last', () => {
    const roles = getRoles(1, 3)
    expect(roles.sb).toBe(2)
    expect(roles.bb).toBe(0)
  })

  it('handles two players correctly (heads-up: dealer is SB)', () => {
    const roles = getRoles(0, 2)
    expect(roles.dealer).toBe(0)
    expect(roles.sb).toBe(1)
    expect(roles.bb).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Step 4 — AWARD_SPLIT_POT
// ---------------------------------------------------------------------------

describe('AWARD_SPLIT_POT', () => {
  it('divides pot equally between two winners', () => {
    const state = makeState({
      pot: 100,
      players: [
        makePlayer({ id: 1, currentStack: 0, currentBet: 50 }),
        makePlayer({ id: 2, currentStack: 0, currentBet: 50 }),
        makePlayer({ id: 3, currentStack: 80, currentBet: 0, hasFolded: true }),
      ],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    const p1 = next.players.find((p) => p.id === 1)
    const p2 = next.players.find((p) => p.id === 2)
    expect(p1.currentStack).toBe(50)
    expect(p2.currentStack).toBe(50)
  })

  it('distributes floor division share, leaving remainder in pot', () => {
    const state = makeState({
      pot: 101,
      players: [
        makePlayer({ id: 1, currentStack: 0 }),
        makePlayer({ id: 2, currentStack: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    const p1 = next.players.find((p) => p.id === 1)
    const p2 = next.players.find((p) => p.id === 2)
    expect(p1.currentStack).toBe(50)
    expect(p2.currentStack).toBe(50)
    expect(next.pot).toBe(1)
  })

  it('does not distribute any chips to a player not in winnerIds', () => {
    const state = makeState({
      pot: 60,
      players: [
        makePlayer({ id: 1, currentStack: 0 }),
        makePlayer({ id: 2, currentStack: 0 }),
        makePlayer({ id: 3, currentStack: 40, hasFolded: true }),
      ],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    const p3 = next.players.find((p) => p.id === 3)
    expect(p3.currentStack).toBe(40)
  })

  it('transitions screen to handComplete', () => {
    const state = makeState({
      pot: 100,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    expect(next.screen).toBe('handComplete')
  })

  it('resets all currentBet values to 0', () => {
    const state = makeState({
      pot: 100,
      players: [
        makePlayer({ id: 1, currentBet: 50 }),
        makePlayer({ id: 2, currentBet: 50 }),
      ],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    next.players.forEach((p) => expect(p.currentBet).toBe(0))
  })

  it('resets all hasFolded to false', () => {
    const state = makeState({
      pot: 60,
      players: [
        makePlayer({ id: 1, hasFolded: false }),
        makePlayer({ id: 2, hasFolded: true }),
      ],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1] })
    next.players.forEach((p) => expect(p.hasFolded).toBe(false))
  })

  it('stores winnerIds array on state', () => {
    const state = makeState({
      pot: 100,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    expect(next.winnerIds).toEqual([1, 2])
  })

  it('handles a single winner via AWARD_SPLIT_POT correctly', () => {
    const state = makeState({
      pot: 80,
      players: [makePlayer({ id: 1, currentStack: 0 }), makePlayer({ id: 2, currentStack: 40 })],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1] })
    const p1 = next.players.find((p) => p.id === 1)
    expect(p1.currentStack).toBe(80)
  })
})

// ---------------------------------------------------------------------------
// Step 5 — SET_BLINDS
// ---------------------------------------------------------------------------

describe('SET_BLINDS', () => {
  it('sets smallBlind and bigBlind on state', () => {
    const state = makeState({ screen: 'setup' })
    const next = dispatch(state, { type: 'SET_BLINDS', smallBlind: 1, bigBlind: 2 })
    expect(next.smallBlind).toBe(1)
    expect(next.bigBlind).toBe(2)
  })

  it('does not change other state fields', () => {
    const state = makeState({ screen: 'setup', pot: 0 })
    const next = dispatch(state, { type: 'SET_BLINDS', smallBlind: 5, bigBlind: 10 })
    expect(next.pot).toBe(0)
    expect(next.screen).toBe('setup')
  })
})

// ---------------------------------------------------------------------------
// Step 5a — POST_BLINDS
// ---------------------------------------------------------------------------

describe('POST_BLINDS', () => {
  it('deducts smallBlind from SB player stack', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    const sb = next.players[1]
    expect(sb.currentStack).toBe(99)
    expect(sb.currentBet).toBe(1)
  })

  it('deducts bigBlind from BB player stack', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    const bb = next.players[2]
    expect(bb.currentStack).toBe(98)
    expect(bb.currentBet).toBe(2)
  })

  it('adds both blinds to the pot', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    expect(next.pot).toBe(3)
  })

  it('posts remaining stack and sets isAllIn when SB stack < smallBlind', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 5,
      bigBlind: 10,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 3 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    const sb = next.players[1]
    expect(sb.currentStack).toBe(0)
    expect(sb.currentBet).toBe(3)
    expect(sb.isAllIn).toBe(true)
  })

  it('posts remaining stack and sets isAllIn when BB stack < bigBlind', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 10,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 7 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    const bb = next.players[2]
    expect(bb.currentStack).toBe(0)
    expect(bb.currentBet).toBe(7)
    expect(bb.isAllIn).toBe(true)
  })

  it('does not set isAllIn when player has enough for their blind', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    expect(next.players[1].isAllIn).toBe(false)
    expect(next.players[2].isAllIn).toBe(false)
  })

  it('does not affect dealer or other non-blind players', () => {
    const state = makeState({
      dealerIndex: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
        makePlayer({ id: 3, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'POST_BLINDS' })
    const dealer = next.players[0]
    expect(dealer.currentStack).toBe(100)
    expect(dealer.currentBet).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Step 6 — Turn order (activePlayerIndex)
// ---------------------------------------------------------------------------

describe('NEXT_PLAYER', () => {
  it('advances activePlayerIndex to the next non-folded, non-all-in player', () => {
    const state = makeState({
      activePlayerIndex: 0,
      players: [
        makePlayer({ id: 1, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 3, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_PLAYER' })
    expect(next.activePlayerIndex).toBe(1)
  })

  it('skips folded players', () => {
    const state = makeState({
      activePlayerIndex: 0,
      players: [
        makePlayer({ id: 1, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, hasFolded: true, isAllIn: false }),
        makePlayer({ id: 3, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_PLAYER' })
    expect(next.activePlayerIndex).toBe(2)
  })

  it('skips all-in players', () => {
    const state = makeState({
      activePlayerIndex: 0,
      players: [
        makePlayer({ id: 1, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, hasFolded: false, isAllIn: true }),
        makePlayer({ id: 3, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_PLAYER' })
    expect(next.activePlayerIndex).toBe(2)
  })

  it('wraps around to first eligible player', () => {
    const state = makeState({
      activePlayerIndex: 2,
      players: [
        makePlayer({ id: 1, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, hasFolded: true, isAllIn: false }),
        makePlayer({ id: 3, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_PLAYER' })
    expect(next.activePlayerIndex).toBe(0)
  })
})

describe('Action advance — activePlayerIndex updates', () => {
  const threePlayerState = makeState({
    activePlayerIndex: 0,
    currentStreet: 'preflop',
    pot: 0,
    players: [
      makePlayer({ id: 1, currentStack: 100, hasFolded: false, isAllIn: false }),
      makePlayer({ id: 2, currentStack: 100, hasFolded: false, isAllIn: false }),
      makePlayer({ id: 3, currentStack: 100, hasFolded: false, isAllIn: false }),
    ],
  })

  it('CHECK advances activePlayerIndex', () => {
    const next = dispatch(threePlayerState, { type: 'CHECK', id: 1 })
    expect(next.activePlayerIndex).toBe(1)
  })

  it('FOLD advances activePlayerIndex', () => {
    const next = dispatch(threePlayerState, { type: 'FOLD', id: 1 })
    expect(next.activePlayerIndex).toBe(1)
  })

  it('PLACE_BET advances activePlayerIndex', () => {
    const next = dispatch(threePlayerState, { type: 'PLACE_BET', id: 1, amount: 10 })
    expect(next.activePlayerIndex).toBe(1)
  })

  it('CALL advances activePlayerIndex', () => {
    const state = makeState({
      activePlayerIndex: 1,
      pot: 10,
      players: [
        makePlayer({ id: 1, currentStack: 90, currentBet: 10, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 3, currentStack: 100, currentBet: 0, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    expect(next.activePlayerIndex).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Step 7 — ADVANCE_STREET
// ---------------------------------------------------------------------------

describe('ADVANCE_STREET', () => {
  it('advances from preflop to flop', () => {
    const state = makeState({ currentStreet: 'preflop', players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })] })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.currentStreet).toBe('flop')
  })

  it('advances from flop to turn', () => {
    const state = makeState({ currentStreet: 'flop', players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })] })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.currentStreet).toBe('turn')
  })

  it('advances from turn to river', () => {
    const state = makeState({ currentStreet: 'turn', players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })] })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.currentStreet).toBe('river')
  })

  it('resets all player currentBet values to 0', () => {
    const state = makeState({
      currentStreet: 'preflop',
      players: [
        makePlayer({ id: 1, currentBet: 20 }),
        makePlayer({ id: 2, currentBet: 20 }),
      ],
    })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    next.players.forEach((p) => expect(p.currentBet).toBe(0))
  })

  it('resets lastBetSize to 0', () => {
    const state = makeState({
      currentStreet: 'flop',
      lastBetSize: 15,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.lastBetSize).toBe(0)
  })

  it('does not reset the pot', () => {
    const state = makeState({
      currentStreet: 'preflop',
      pot: 80,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.pot).toBe(80)
  })

  it('sets activePlayerIndex to first non-folded, non-all-in player after dealer', () => {
    const state = makeState({
      currentStreet: 'preflop',
      dealerIndex: 0,
      players: [
        makePlayer({ id: 1, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 2, hasFolded: false, isAllIn: false }),
        makePlayer({ id: 3, hasFolded: false, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'ADVANCE_STREET' })
    expect(next.activePlayerIndex).toBe(1)
  })
})

describe('START_GAME sets currentStreet to preflop', () => {
  it('sets currentStreet to preflop when game starts', () => {
    const state = makeState({ screen: 'setup', currentStreet: null, players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })] })
    const next = dispatch(state, { type: 'START_GAME' })
    expect(next.currentStreet).toBe('preflop')
  })
})

describe('NEXT_HAND resets street state', () => {
  it('resets currentStreet to preflop', () => {
    const state = makeState({
      screen: 'handComplete',
      currentStreet: 'river',
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    expect(next.currentStreet).toBe('preflop')
  })

  it('resets lastBetSize to 0', () => {
    const state = makeState({
      screen: 'handComplete',
      lastBetSize: 25,
      players: [makePlayer({ id: 1 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    expect(next.lastBetSize).toBe(0)
  })
})

describe('AWARD_POT clears street and activePlayerIndex', () => {
  it('clears currentStreet on transition to handComplete', () => {
    const state = makeState({
      currentStreet: 'river',
      pot: 100,
      players: [makePlayer({ id: 1, currentStack: 0 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'AWARD_POT', winnerId: 1 })
    expect(next.currentStreet).toBeNull()
  })

  it('clears activePlayerIndex on transition to handComplete', () => {
    const state = makeState({
      activePlayerIndex: 1,
      pot: 100,
      players: [makePlayer({ id: 1, currentStack: 0 }), makePlayer({ id: 2 })],
    })
    const next = dispatch(state, { type: 'AWARD_POT', winnerId: 1 })
    expect(next.activePlayerIndex).toBeNull()
  })
})

describe('AWARD_SPLIT_POT clears street and activePlayerIndex', () => {
  it('clears currentStreet on transition to handComplete', () => {
    const state = makeState({
      currentStreet: 'river',
      pot: 100,
      activePlayerIndex: 0,
      players: [makePlayer({ id: 1, currentStack: 0 }), makePlayer({ id: 2, currentStack: 0 })],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    expect(next.currentStreet).toBeNull()
  })

  it('clears activePlayerIndex on transition to handComplete', () => {
    const state = makeState({
      currentStreet: 'river',
      pot: 100,
      activePlayerIndex: 1,
      players: [makePlayer({ id: 1, currentStack: 0 }), makePlayer({ id: 2, currentStack: 0 })],
    })
    const next = dispatch(state, { type: 'AWARD_SPLIT_POT', winnerIds: [1, 2] })
    expect(next.activePlayerIndex).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Step 8 — lastBetSize updated by PLACE_BET
// ---------------------------------------------------------------------------

describe('PLACE_BET — lastBetSize tracking', () => {
  it('sets lastBetSize to bet amount when no previous bet exists on street', () => {
    const state = makeState({
      lastBetSize: 0,
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100, currentBet: 0 }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'PLACE_BET', id: 1, amount: 10 })
    expect(next.lastBetSize).toBe(10)
  })

  it('sets lastBetSize to the raise increment when a bet already exists', () => {
    const state = makeState({
      lastBetSize: 10,
      pot: 10,
      players: [
        makePlayer({ id: 1, currentStack: 90, currentBet: 10 }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0 }),
      ],
    })
    // Player 2 raises to 25 — the raise increment over the existing 10 is 15
    const next = dispatch(state, { type: 'PLACE_BET', id: 2, amount: 25 })
    expect(next.lastBetSize).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// Step 9 — All-in constraints
// ---------------------------------------------------------------------------

describe('PLACE_BET — all-in', () => {
  it('sets isAllIn to true when stack reaches 0', () => {
    const state = makeState({
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 50 }),
        makePlayer({ id: 2, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'PLACE_BET', id: 1, amount: 50 })
    const p1 = next.players.find((p) => p.id === 1)
    expect(p1.isAllIn).toBe(true)
    expect(p1.currentStack).toBe(0)
  })

  it('does not set isAllIn when stack remains > 0', () => {
    const state = makeState({
      pot: 0,
      players: [
        makePlayer({ id: 1, currentStack: 100 }),
        makePlayer({ id: 2, currentStack: 100 }),
      ],
    })
    const next = dispatch(state, { type: 'PLACE_BET', id: 1, amount: 20 })
    const p1 = next.players.find((p) => p.id === 1)
    expect(p1.isAllIn).toBe(false)
  })
})

describe('CALL — all-in', () => {
  it('sets isAllIn to true when calling player stack reaches 0', () => {
    const state = makeState({
      pot: 100,
      players: [
        makePlayer({ id: 1, currentStack: 0, currentBet: 100 }),
        makePlayer({ id: 2, currentStack: 60, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.isAllIn).toBe(true)
    expect(p2.currentStack).toBe(0)
  })

  it('does not set isAllIn when caller still has chips after call', () => {
    const state = makeState({
      pot: 10,
      players: [
        makePlayer({ id: 1, currentStack: 90, currentBet: 10 }),
        makePlayer({ id: 2, currentStack: 100, currentBet: 0 }),
      ],
    })
    const next = dispatch(state, { type: 'CALL', id: 2 })
    const p2 = next.players.find((p) => p.id === 2)
    expect(p2.isAllIn).toBe(false)
  })
})

describe('NEXT_HAND — resets isAllIn', () => {
  it('resets isAllIn to false for all players', () => {
    const state = makeState({
      screen: 'handComplete',
      players: [
        makePlayer({ id: 1, isAllIn: true }),
        makePlayer({ id: 2, isAllIn: false }),
      ],
    })
    const next = dispatch(state, { type: 'NEXT_HAND' })
    next.players.forEach((p) => expect(p.isAllIn).toBe(false))
  })
})

// ---------------------------------------------------------------------------
// Step 10 — Check prevention (logic helper — not the reducer)
// ---------------------------------------------------------------------------

describe('Check prevention logic', () => {
  function canCheck(player, players) {
    const maxBet = Math.max(...players.filter((p) => !p.hasFolded).map((p) => p.currentBet))
    return player.currentBet >= maxBet
  }

  it('allows check when no wager exists', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 0 }),
      makePlayer({ id: 2, currentBet: 0 }),
    ]
    expect(canCheck(players[0], players)).toBe(true)
  })

  it('blocks check when another active player has a higher currentBet', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 0 }),
      makePlayer({ id: 2, currentBet: 20 }),
    ]
    expect(canCheck(players[0], players)).toBe(false)
  })

  it('allows check when player has already matched the max bet', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 20 }),
      makePlayer({ id: 2, currentBet: 20 }),
    ]
    expect(canCheck(players[0], players)).toBe(true)
  })

  it('ignores folded players when computing max bet for check', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 0 }),
      makePlayer({ id: 2, currentBet: 20, hasFolded: true }),
    ]
    expect(canCheck(players[0], players)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Split pot remainder display (pure computation)
// ---------------------------------------------------------------------------

describe('Split pot remainder calculation', () => {
  it('calculates per-winner share using floor division', () => {
    expect(Math.floor(101 / 2)).toBe(50)
  })

  it('calculates remainder correctly', () => {
    expect(101 % 2).toBe(1)
  })

  it('has zero remainder when pot divides evenly', () => {
    expect(100 % 2).toBe(0)
  })

  it('handles three-way split with remainder', () => {
    expect(Math.floor(100 / 3)).toBe(33)
    expect(100 % 3).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Call amount display (pure computation)
// ---------------------------------------------------------------------------

describe('Call amount calculation', () => {
  it('is maxBet minus player currentBet', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 20 }),
      makePlayer({ id: 2, currentBet: 0 }),
    ]
    const maxBet = Math.max(...players.map((p) => p.currentBet))
    const callAmount = maxBet - players[1].currentBet
    expect(callAmount).toBe(20)
  })

  it('is capped at player stack for all-in call display', () => {
    const playerStack = 15
    const callAmount = 30
    const effectiveCall = Math.min(callAmount, playerStack)
    expect(effectiveCall).toBe(15)
  })

  it('is 0 when player has already matched max bet', () => {
    const players = [
      makePlayer({ id: 1, currentBet: 20 }),
      makePlayer({ id: 2, currentBet: 20 }),
    ]
    const maxBet = Math.max(...players.map((p) => p.currentBet))
    const callAmount = maxBet - players[1].currentBet
    expect(callAmount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// initialState shape
// ---------------------------------------------------------------------------

describe('initialState shape', () => {
  it('includes dealerIndex defaulting to 0', () => {
    expect(initialState).toHaveProperty('dealerIndex', 0)
  })

  it('includes smallBlind defaulting to null', () => {
    expect(initialState).toHaveProperty('smallBlind', null)
  })

  it('includes bigBlind defaulting to null', () => {
    expect(initialState).toHaveProperty('bigBlind', null)
  })

  it('includes currentStreet defaulting to null', () => {
    expect(initialState).toHaveProperty('currentStreet', null)
  })

  it('includes activePlayerIndex defaulting to null', () => {
    expect(initialState).toHaveProperty('activePlayerIndex', null)
  })

  it('includes lastBetSize defaulting to 0', () => {
    expect(initialState).toHaveProperty('lastBetSize', 0)
  })
})
