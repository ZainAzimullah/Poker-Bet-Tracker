import { track } from './analytics'

export const initialState = {
  screen: 'setup',
  handNumber: 0,
  pot: 0,
  dealerIndex: 0,
  smallBlind: null,
  bigBlind: null,
  currentStreet: null,
  activePlayerIndex: null,
  lastBetSize: 0,
  headsUpStreak: 0,
  firstActorIndex: null,
  pendingStreetPrompt: null,
  streetAggressionCount: 0,
  players: [],
}

let nextId = 1

const NEXT_STREET = { preflop: 'flop', flop: 'turn', turn: 'river', river: null }

export function getBlindIndices(dealerIndex, playerCount, headsUpStreak) {
  let sb = (dealerIndex + 1) % playerCount
  let bb = (dealerIndex + 2) % playerCount
  if (playerCount === 2 && headsUpStreak === 1) {
    return { sbIdx: bb, bbIdx: sb }
  }
  return { sbIdx: sb, bbIdx: bb }
}

export function nextEligibleIndex(players, fromIndex) {
  const count = players.length
  for (let i = 1; i <= count; i++) {
    const idx = (fromIndex + i) % count
    if (!players[idx].hasFolded && !players[idx].isAllIn) return idx
  }
  return fromIndex
}

function maxContribution(players) {
  const active = players.filter((p) => !p.hasFolded)
  if (active.length === 0) return 0
  return Math.max(0, ...active.map((p) => p.currentBet))
}

function needsContributionToMatch(players) {
  const maxBet = maxContribution(players)
  return players.some((p) => !p.hasFolded && !p.isAllIn && p.currentBet < maxBet)
}

function livePlayerCount(players) {
  return players.filter((p) => !p.hasFolded).length
}

/** Betting round complete: all matched (given MVP all-in rules) and action closed back to first actor. */
export function isBettingRoundClosed(players, firstActorIndex, actingPlayerIndex) {
  if (firstActorIndex === null || firstActorIndex === undefined) return false
  if (livePlayerCount(players) <= 1) return true
  if (needsContributionToMatch(players)) return false
  const nextIdx = nextEligibleIndex(players, actingPlayerIndex)
  return nextIdx === firstActorIndex
}

function applyPostBlinds(state) {
  if (!state.smallBlind || !state.bigBlind) return state
  const { players, dealerIndex, smallBlind, bigBlind, headsUpStreak } = state
  const count = players.length
  const { sbIdx, bbIdx } = getBlindIndices(dealerIndex, count, headsUpStreak)
  let pot = state.pot

  const newPlayers = players.map((p, idx) => {
    if (idx === sbIdx) {
      const amount = Math.min(smallBlind, p.currentStack)
      const newStack = p.currentStack - amount
      pot += amount
      return {
        ...p,
        currentStack: newStack,
        currentBet: p.currentBet + amount,
        isAllIn: newStack === 0,
      }
    }
    if (idx === bbIdx) {
      const amount = Math.min(bigBlind, p.currentStack)
      const newStack = p.currentStack - amount
      pot += amount
      return {
        ...p,
        currentStack: newStack,
        currentBet: p.currentBet + amount,
        isAllIn: newStack === 0,
      }
    }
    return p
  })

  return { ...state, pot, players: newPlayers }
}

function advanceStreetCore(state) {
  const nextStreet = NEXT_STREET[state.currentStreet] ?? null
  track('street_advanced', { street_name: nextStreet, hand_number: state.handNumber })
  const newPlayers = state.players.map((p) => ({ ...p, currentBet: 0 }))
  const firstPost = nextEligibleIndex(newPlayers, state.dealerIndex)
  return {
    ...state,
    currentStreet: nextStreet,
    lastBetSize: 0,
    streetAggressionCount: 0,
    pendingStreetPrompt: null,
    firstActorIndex: firstPost,
    activePlayerIndex: firstPost,
    players: newPlayers,
  }
}

function nextHuState(dealerIndex, headsUpStreak, playerCount) {
  if (playerCount !== 2) {
    return {
      dealerIndex: (dealerIndex + 1) % playerCount,
      headsUpStreak: 0,
    }
  }
  if (headsUpStreak === 0) {
    return { dealerIndex, headsUpStreak: 1 }
  }
  return {
    dealerIndex: (dealerIndex + 1) % 2,
    headsUpStreak: 0,
  }
}

function maybeStreetPromptAfterRound(nextState) {
  const { players, currentStreet: street } = nextState
  if (!street || street === 'river') {
    return { ...nextState, activePlayerIndex: null, pendingStreetPrompt: null }
  }
  if (livePlayerCount(players) <= 1) {
    return { ...nextState, activePlayerIndex: null, pendingStreetPrompt: null }
  }
  const nextKey = NEXT_STREET[street]
  track('street_prompt_shown', { next_street: nextKey, hand_number: nextState.handNumber })
  return {
    ...nextState,
    activePlayerIndex: null,
    pendingStreetPrompt: nextKey,
  }
}

function finalizePlayerAction(nextState, newPlayers, actingIndex) {
  const closed = isBettingRoundClosed(newPlayers, nextState.firstActorIndex, actingIndex)
  if (!closed) {
    const nextA =
      nextState.activePlayerIndex !== null ? nextEligibleIndex(newPlayers, actingIndex) : null
    return { ...nextState, players: newPlayers, activePlayerIndex: nextA }
  }

  if (livePlayerCount(newPlayers) <= 1) {
    return { ...nextState, players: newPlayers, activePlayerIndex: null, pendingStreetPrompt: null }
  }

  return maybeStreetPromptAfterRound({ ...nextState, players: newPlayers })
}

function assertTurn(state, playerIndex, actionType) {
  if (state.pendingStreetPrompt != null) return false
  if (state.activePlayerIndex === null) return false
  if (state.activePlayerIndex !== playerIndex) {
    track('turn_violation_attempt', { action_type: actionType, hand_number: state.handNumber })
    return false
  }
  return true
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const player = {
        id: nextId++,
        name: action.name,
        startingStack: action.buyIn,
        currentStack: action.buyIn,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
      }
      track('player_added', { number_of_players: state.players.length + 1 })
      track('buy_in_added', { player_stack: action.buyIn })
      return { ...state, players: [...state.players, player] }
    }

    case 'REMOVE_PLAYER': {
      return { ...state, players: state.players.filter((p) => p.id !== action.id) }
    }

    case 'SET_BLINDS': {
      track('blind_config_set', { small_blind: action.smallBlind, big_blind: action.bigBlind })
      return { ...state, smallBlind: action.smallBlind, bigBlind: action.bigBlind }
    }

    case 'START_GAME': {
      const handNumber = 1
      track('game_started', { number_of_players: state.players.length })
      track('hand_started', { hand_number: handNumber })
      const basePlayers = state.players.map((p) => ({
        ...p,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
      }))
      const { bbIdx } = getBlindIndices(state.dealerIndex, basePlayers.length, 0)
      const firstAct = nextEligibleIndex(basePlayers, bbIdx)
      const baseState = {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        currentStreet: 'preflop',
        lastBetSize: 0,
        headsUpStreak: 0,
        streetAggressionCount: 0,
        pendingStreetPrompt: null,
        firstActorIndex: firstAct,
        activePlayerIndex: firstAct,
        players: basePlayers,
      }
      return applyPostBlinds(baseState)
    }

    case 'POST_BLINDS': {
      return applyPostBlinds(state)
    }

    case 'PLACE_BET': {
      const { id, amount } = action
      const playerIndex = state.players.findIndex((p) => p.id === id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'PLACE_BET')) return state

      const previousMaxBet = Math.max(0, ...state.players.filter((p) => !p.hasFolded).map((p) => p.currentBet))
      const newLastBetSize = previousMaxBet > 0 ? amount - previousMaxBet : amount

      const newPlayers = state.players.map((p) => {
        if (p.id !== id) return p
        const newStack = p.currentStack - amount
        return { ...p, currentStack: newStack, currentBet: p.currentBet + amount, isAllIn: newStack === 0 }
      })

      const newMax = Math.max(0, ...newPlayers.filter((p) => !p.hasFolded).map((p) => p.currentBet))
      let streetAggressionCount = state.streetAggressionCount
      if (newMax > previousMaxBet) {
        streetAggressionCount += 1
      }

      const isAllIn = newPlayers[playerIndex].isAllIn
      track('bet_placed', { bet_amount: amount, hand_number: state.handNumber, player_stack: newPlayers[playerIndex].currentStack })
      if (isAllIn) track('all_in_placed', { player_stack: 0, hand_number: state.handNumber })

      const nextState = {
        ...state,
        pot: state.pot + amount,
        lastBetSize: newLastBetSize,
        streetAggressionCount,
        players: newPlayers,
      }

      return finalizePlayerAction(nextState, newPlayers, playerIndex)
    }

    case 'CALL': {
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'CALL')) return state

      const maxBet = Math.max(0, ...state.players.filter((p) => !p.hasFolded).map((p) => p.currentBet))
      const player = state.players[playerIndex]
      const callAmount = Math.min(maxBet - player.currentBet, player.currentStack)
      if (callAmount <= 0) return state

      const newPlayers = state.players.map((p) => {
        if (p.id !== action.id) return p
        const newStack = p.currentStack - callAmount
        return { ...p, currentStack: newStack, currentBet: p.currentBet + callAmount, isAllIn: newStack === 0 }
      })

      const isAllIn = newPlayers[playerIndex].isAllIn
      track('call_placed', { call_amount: callAmount, player_stack: newPlayers[playerIndex].currentStack, hand_number: state.handNumber })
      if (isAllIn) track('all_in_placed', { player_stack: 0, hand_number: state.handNumber })

      const nextState = {
        ...state,
        pot: state.pot + callAmount,
        players: newPlayers,
      }

      return finalizePlayerAction(nextState, newPlayers, playerIndex)
    }

    case 'CHECK': {
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'CHECK')) return state

      track('check_selected', { hand_number: state.handNumber })
      return finalizePlayerAction({ ...state }, state.players, playerIndex)
    }

    case 'FOLD': {
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'FOLD')) return state

      track('player_folded', { hand_number: state.handNumber })
      const newPlayers = state.players.map((p) => (p.id === action.id ? { ...p, hasFolded: true } : p))
      return finalizePlayerAction({ ...state }, newPlayers, playerIndex)
    }

    case 'ROTATE_DEALER': {
      if (state.screen !== 'setup') {
        track('dealer_rotate_blocked', { screen: state.screen })
        return state
      }
      return { ...state, dealerIndex: (state.dealerIndex + 1) % state.players.length }
    }

    case 'CONFIRM_NEXT_STREET': {
      if (!state.pendingStreetPrompt) return state
      track('street_confirmed', { next_street: state.pendingStreetPrompt, hand_number: state.handNumber })
      return advanceStreetCore({ ...state, pendingStreetPrompt: null })
    }

    case 'ADVANCE_STREET': {
      return state
    }

    case 'END_HAND': {
      return { ...state, screen: 'endHand', pendingStreetPrompt: null }
    }

    case 'CANCEL_END_HAND': {
      return { ...state, screen: 'gameplay' }
    }

    case 'AWARD_POT': {
      track('hand_completed', { hand_number: state.handNumber })
      return {
        ...state,
        screen: 'handComplete',
        winnerId: action.winnerId,
        winnerIds: null,
        currentStreet: null,
        activePlayerIndex: null,
        firstActorIndex: null,
        pendingStreetPrompt: null,
        streetAggressionCount: 0,
        players: state.players.map((p) =>
          p.id === action.winnerId ? { ...p, currentStack: p.currentStack + state.pot } : p
        ),
      }
    }

    case 'AWARD_SPLIT_POT': {
      const { winnerIds } = action
      const share = Math.floor(state.pot / winnerIds.length)
      const remainder = state.pot % winnerIds.length
      track('split_pot_awarded', { split_count: winnerIds.length, pot_amount: state.pot, hand_number: state.handNumber })
      return {
        ...state,
        screen: 'handComplete',
        pot: remainder,
        winnerId: null,
        winnerIds,
        splitShare: share,
        currentStreet: null,
        activePlayerIndex: null,
        firstActorIndex: null,
        pendingStreetPrompt: null,
        streetAggressionCount: 0,
        players: state.players.map((p) => ({
          ...p,
          currentStack: winnerIds.includes(p.id) ? p.currentStack + share : p.currentStack,
          currentBet: 0,
          hasFolded: false,
        })),
      }
    }

    case 'NEXT_HAND': {
      const handNumber = state.handNumber + 1
      if (handNumber === 2) track('second_hand_started')
      track('hand_started', { hand_number: handNumber })
      const n = state.players.length
      const { dealerIndex: nd, headsUpStreak: nh } = nextHuState(state.dealerIndex, state.headsUpStreak, n)
      const basePlayers = state.players.map((p) => ({
        ...p,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
      }))
      const { bbIdx } = getBlindIndices(nd, n, nh)
      const firstAct = nextEligibleIndex(basePlayers, bbIdx)
      const baseState = {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        winnerId: null,
        winnerIds: null,
        splitShare: null,
        dealerIndex: nd,
        headsUpStreak: nh,
        currentStreet: 'preflop',
        lastBetSize: 0,
        streetAggressionCount: 0,
        pendingStreetPrompt: null,
        firstActorIndex: firstAct,
        activePlayerIndex: firstAct,
        players: basePlayers,
      }
      return applyPostBlinds(baseState)
    }

    default:
      return state
  }
}
