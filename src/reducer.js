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
  /** Last player index who increased the street max via PLACE_BET; null if only blinds/calls/checks so far. */
  lastRaisePlayerIndex: null,
  players: [],
}

let nextId = 1

const NEXT_STREET = { preflop: 'flop', flop: 'turn', turn: 'river', river: null }

/** Seat indices still in the game (not busted out). */
export function getActiveSeatIndices(players) {
  const idxs = []
  for (let i = 0; i < players.length; i++) {
    if (!players[i].bustedOut) idxs.push(i)
  }
  return idxs
}

/** Next non-busted seat clockwise from current dealer (full table indices). */
export function nextDealerIndexAfterHand(players, currentDealerIndex) {
  const len = players.length
  if (len === 0) return currentDealerIndex
  for (let i = 1; i <= len; i++) {
    const idx = (currentDealerIndex + i) % len
    if (!players[idx].bustedOut) return idx
  }
  return currentDealerIndex
}

/**
 * SB/BB seats among non-busted players only. Dealer may sit on a busted seat index;
 * blind seats are computed from the dealer's position in the active ring.
 */
export function getBlindIndices(players, dealerIndex, headsUpStreak) {
  const active = getActiveSeatIndices(players)
  const n = active.length
  if (n < 2) {
    const only = n === 1 ? active[0] : 0
    return { sbIdx: only, bbIdx: only }
  }
  let dPos = active.indexOf(dealerIndex)
  if (dPos < 0) dPos = 0
  const sb = active[(dPos + 1) % n]
  const bb = active[(dPos + 2) % n]
  if (n === 2 && headsUpStreak === 1) {
    return { sbIdx: bb, bbIdx: sb }
  }
  return { sbIdx: sb, bbIdx: bb }
}

/** True if this seat may take a betting action (chips behind or can open). */
function canVolitionallyActSeat(players, idx) {
  const p = players[idx]
  if (!p || p.bustedOut || p.hasFolded || p.isAllIn) return false
  if (p.currentStack <= 0) return false
  return true
}

/** Next seat that may still bet (not busted, not folded, not all-in, has chips). Null if no one can act. */
export function nextEligibleIndex(players, fromIndex) {
  const count = players.length
  for (let i = 1; i <= count; i++) {
    const idx = (fromIndex + i) % count
    if (canVolitionallyActSeat(players, idx)) return idx
  }
  return canVolitionallyActSeat(players, fromIndex) ? fromIndex : null
}

function maxContribution(players) {
  const active = players.filter((p) => !p.hasFolded && !p.bustedOut)
  if (active.length === 0) return 0
  return Math.max(0, ...active.map((p) => p.currentBet))
}

function needsContributionToMatch(players) {
  const maxBet = maxContribution(players)
  return players.some(
    (p) =>
      !p.bustedOut &&
      !p.hasFolded &&
      !p.isAllIn &&
      p.currentStack > 0 &&
      p.currentBet < maxBet,
  )
}

function livePlayerCount(players) {
  return players.filter((p) => !p.hasFolded && !p.bustedOut).length
}

/**
 * Betting round complete: all matched (given MVP all-in rules) and either
 * - action closed back to first actor, or
 * - next to act would be the last raiser, who already has the full wager in (no second action), or
 * - next volitional seat already has the street max in (e.g. last aggressor was all-in and is skipped).
 *
 * roundMeta: { currentStreet, bigBlind, bbIdx } — required from finalizePlayerAction so we do not
 * close preflop before the big blind's check-raise option when only blinds are posted.
 */
export function isBettingRoundClosed(
  players,
  firstActorIndex,
  actingPlayerIndex,
  lastRaisePlayerIndex,
  roundMeta = {},
) {
  const { currentStreet, bigBlind, bbIdx } = roundMeta
  if (livePlayerCount(players) <= 1) return true
  if (needsContributionToMatch(players)) return false
  const nextIdx = nextEligibleIndex(players, actingPlayerIndex)
  if (nextIdx === null) return true

  const maxB = maxContribution(players)
  const nextPlayer = players[nextIdx]
  if (
    maxB > 0 &&
    nextPlayer &&
    !nextPlayer.hasFolded &&
    !nextPlayer.bustedOut &&
    nextPlayer.currentBet >= maxB
  ) {
    const bbStillHasPreflopOption =
      currentStreet === 'preflop' &&
      lastRaisePlayerIndex == null &&
      bigBlind != null &&
      maxB === bigBlind &&
      bbIdx != null &&
      nextIdx === bbIdx
    // Require a street aggressor so "next seat matched" does not end the round on the first check
    // when maxBet > 0 only from odd legacy state (no lastRaise).
    if (!bbStillHasPreflopOption && lastRaisePlayerIndex != null) {
      return true
    }
  }

  if (firstActorIndex === null || firstActorIndex === undefined) return false
  if (nextIdx === firstActorIndex) return true
  if (
    lastRaisePlayerIndex !== null &&
    lastRaisePlayerIndex !== undefined &&
    nextIdx === lastRaisePlayerIndex
  ) {
    return true
  }
  return false
}

function applyPostBlinds(state) {
  if (!state.smallBlind || !state.bigBlind) return state
  const { players, dealerIndex, smallBlind, bigBlind, headsUpStreak } = state
  const { sbIdx, bbIdx } = getBlindIndices(players, dealerIndex, headsUpStreak)
  let pot = state.pot

  const newPlayers = players.map((p, idx) => {
    if (p.bustedOut) return p
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

  const out = { ...state, pot, players: newPlayers }
  const fa = nextEligibleIndex(newPlayers, bbIdx)
  if (fa === null) {
    const stalled = {
      ...out,
      firstActorIndex: null,
      activePlayerIndex: null,
    }
    if (livePlayerCount(newPlayers) <= 1) return stalled
    return maybeStreetPromptAfterRound(stalled)
  }
  return {
    ...out,
    firstActorIndex: fa,
    activePlayerIndex: fa,
  }
}

function advanceStreetCore(state) {
  const nextStreet = NEXT_STREET[state.currentStreet] ?? null
  track('street_advanced', { street_name: nextStreet, hand_number: state.handNumber })
  const newPlayers = state.players.map((p) => ({ ...p, currentBet: 0 }))
  const firstPost = nextEligibleIndex(newPlayers, state.dealerIndex)
  const partial = {
    ...state,
    currentStreet: nextStreet,
    lastBetSize: 0,
    streetAggressionCount: 0,
    lastRaisePlayerIndex: null,
    pendingStreetPrompt: null,
    firstActorIndex: firstPost,
    activePlayerIndex: firstPost,
    players: newPlayers,
  }
  if (firstPost === null) {
    if (livePlayerCount(newPlayers) <= 1) {
      return { ...partial, activePlayerIndex: null, firstActorIndex: null, pendingStreetPrompt: null }
    }
    return maybeStreetPromptAfterRound({ ...partial, activePlayerIndex: null, firstActorIndex: null })
  }
  return applySoleActorAutoPasses(partial)
}

function nextHuState(players, dealerIndex, headsUpStreak) {
  const active = getActiveSeatIndices(players)
  const n = active.length
  if (n !== 2) {
    return {
      dealerIndex: nextDealerIndexAfterHand(players, dealerIndex),
      headsUpStreak: 0,
    }
  }
  if (headsUpStreak === 0) {
    return { dealerIndex, headsUpStreak: 1 }
  }
  return {
    dealerIndex: nextDealerIndexAfterHand(players, dealerIndex),
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

/** Re-anchor first actor when null or pointing at a seat that can no longer act (e.g. all-in). */
function repairFirstActorIndex(state, players) {
  const street = state.currentStreet
  const anchor =
    street === 'preflop'
      ? getBlindIndices(players, state.dealerIndex, state.headsUpStreak ?? 0).bbIdx
      : state.dealerIndex
  const fa = state.firstActorIndex
  if (fa == null) {
    return nextEligibleIndex(players, anchor)
  }
  if (canVolitionallyActSeat(players, fa)) {
    return fa
  }
  return nextEligibleIndex(players, anchor)
}

function finalizePlayerAction(nextState, newPlayers, actingIndex) {
  const repairedFA = repairFirstActorIndex(nextState, newPlayers)
  const base =
    repairedFA !== nextState.firstActorIndex
      ? { ...nextState, firstActorIndex: repairedFA }
      : nextState

  const { bbIdx } = getBlindIndices(newPlayers, base.dealerIndex, base.headsUpStreak ?? 0)
  const closed = isBettingRoundClosed(
    newPlayers,
    base.firstActorIndex,
    actingIndex,
    base.lastRaisePlayerIndex,
    {
      currentStreet: base.currentStreet,
      bigBlind: base.bigBlind,
      bbIdx,
    },
  )
  if (!closed) {
    let nextA =
      base.activePlayerIndex !== null ? nextEligibleIndex(newPlayers, actingIndex) : null
    if (nextA === null) {
      const stalled = { ...base, players: newPlayers, activePlayerIndex: null }
      if (livePlayerCount(newPlayers) <= 1) {
        return { ...stalled, pendingStreetPrompt: null }
      }
      return maybeStreetPromptAfterRound(stalled)
    }
    return applySoleActorAutoPasses({ ...base, players: newPlayers, activePlayerIndex: nextA })
  }

  if (livePlayerCount(newPlayers) <= 1) {
    return { ...base, players: newPlayers, activePlayerIndex: null, pendingStreetPrompt: null }
  }

  return maybeStreetPromptAfterRound({ ...base, players: newPlayers })
}

/** Single player who can still place chips; null if zero or multiple. */
function soleVolitionalPlayerIndex(players) {
  let found = null
  for (let i = 0; i < players.length; i++) {
    if (canVolitionallyActSeat(players, i)) {
      if (found !== null) return null
      found = i
    }
  }
  return found
}

/**
 * Skip all-in seats; auto-"check" when the only player who can bet has nothing to call
 * (everyone else all-in or folded) so the hand does not stall.
 */
function applySoleActorAutoPasses(state) {
  let s = state
  for (let guard = 0; guard < 48; guard++) {
    const a = s.activePlayerIndex
    if (a === null || s.pendingStreetPrompt != null) return s

    const ps = s.players
    if (ps[a].bustedOut) {
      const next = nextEligibleIndex(ps, a)
      if (next === null) {
        if (livePlayerCount(ps) <= 1) {
          return { ...s, players: ps, activePlayerIndex: null, firstActorIndex: null, pendingStreetPrompt: null }
        }
        return maybeStreetPromptAfterRound({
          ...s,
          players: ps,
          activePlayerIndex: null,
          firstActorIndex: null,
        })
      }
      s = { ...s, players: ps, activePlayerIndex: next }
      continue
    }
    if (ps[a].isAllIn) {
      const next = nextEligibleIndex(ps, a)
      if (next === null) {
        if (livePlayerCount(ps) <= 1) {
          return { ...s, players: ps, activePlayerIndex: null, firstActorIndex: null, pendingStreetPrompt: null }
        }
        return maybeStreetPromptAfterRound({
          ...s,
          players: ps,
          activePlayerIndex: null,
          firstActorIndex: null,
        })
      }
      s = { ...s, players: ps, activePlayerIndex: next }
      continue
    }

    const sole = soleVolitionalPlayerIndex(ps)
    if (sole !== a) return s

    const maxBet = maxContribution(ps)
    if (ps[a].currentBet < maxBet) return s

    track('check_selected', { hand_number: s.handNumber, auto_sole_actor: true })
    s = finalizePlayerAction({ ...s }, ps, a)
  }
  return s
}

function assertTurn(state, playerIndex, actionType) {
  if (state.pendingStreetPrompt != null) return false
  if (state.activePlayerIndex === null) return false
  if (state.players[playerIndex]?.bustedOut) {
    track('busted_action_blocked', { action_type: actionType, hand_number: state.handNumber })
    return false
  }
  if (state.players[playerIndex]?.isAllIn) {
    track('all_in_action_blocked', { action_type: actionType, hand_number: state.handNumber })
    return false
  }
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
        bustedOut: false,
      }
      track('player_added', { number_of_players: state.players.length + 1 })
      track('buy_in_added', { player_stack: action.buyIn })
      return { ...state, players: [...state.players, player] }
    }

    case 'REMOVE_PLAYER': {
      const players = state.players.filter((p) => p.id !== action.id)
      const len = players.length
      return {
        ...state,
        players,
        dealerIndex: len > 0 ? Math.min(state.dealerIndex, len - 1) : 0,
      }
    }

    case 'SET_BLINDS': {
      track('blind_config_set', { small_blind: action.smallBlind, big_blind: action.bigBlind })
      return { ...state, smallBlind: action.smallBlind, bigBlind: action.bigBlind }
    }

    case 'START_GAME': {
      if (state.players.filter((p) => !p.bustedOut).length < 2) return state
      const handNumber = 1
      track('game_started', { number_of_players: state.players.length })
      track('hand_started', { hand_number: handNumber })
      const basePlayers = state.players.map((p) => ({
        ...p,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
      }))
      const baseState = {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        currentStreet: 'preflop',
        lastBetSize: 0,
        headsUpStreak: 0,
        streetAggressionCount: 0,
        lastRaisePlayerIndex: null,
        pendingStreetPrompt: null,
        firstActorIndex: null,
        activePlayerIndex: null,
        players: basePlayers,
      }
      return applySoleActorAutoPasses(applyPostBlinds(baseState))
    }

    case 'POST_BLINDS': {
      return applyPostBlinds(state)
    }

    case 'PLACE_BET': {
      const { id, targetStreetBet } = action
      const playerIndex = state.players.findIndex((p) => p.id === id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'PLACE_BET')) return state

      const player = state.players[playerIndex]
      const previousMaxBet = Math.max(
        0,
        ...state.players.filter((p) => !p.hasFolded && !p.bustedOut).map((p) => p.currentBet),
      )

      let target = typeof targetStreetBet === 'number' ? targetStreetBet : null
      if (target == null && typeof action.amount === 'number') {
        target = player.currentBet + action.amount
      }
      if (target == null || Number.isNaN(target)) return state

      const maxAffordableBet = player.currentBet + player.currentStack
      const newBet = Math.min(target, maxAffordableBet)
      const increment = newBet - player.currentBet
      if (increment <= 0) return state

      const bb = state.bigBlind || 1
      const minRaiseUnit = Math.max(state.lastBetSize || 0, bb)

      if (previousMaxBet === 0) {
        if (newBet < bb && !(newBet === maxAffordableBet && maxAffordableBet < bb)) return state
      } else {
        if (newBet < previousMaxBet) return state
        if (newBet === previousMaxBet) return state
        const minRaiseTotal = previousMaxBet + minRaiseUnit
        const shortAllInRaise =
          newBet === maxAffordableBet && newBet > previousMaxBet && newBet < minRaiseTotal
        if (newBet < minRaiseTotal && !shortAllInRaise && newBet < maxAffordableBet) return state
      }

      const newPlayers = state.players.map((p) => {
        if (p.id !== id) return p
        const newStack = p.currentStack - increment
        return { ...p, currentStack: newStack, currentBet: newBet, isAllIn: newStack === 0 }
      })

      const newMax = Math.max(0, ...newPlayers.filter((p) => !p.hasFolded && !p.bustedOut).map((p) => p.currentBet))
      let streetAggressionCount = state.streetAggressionCount
      if (newMax > previousMaxBet) {
        streetAggressionCount += 1
      }

      const raiseIncrement = newMax > previousMaxBet ? newMax - previousMaxBet : 0
      const isAllIn = newPlayers[playerIndex].isAllIn
      track('bet_placed', { bet_amount: increment, hand_number: state.handNumber, player_stack: newPlayers[playerIndex].currentStack })
      if (isAllIn) track('all_in_placed', { player_stack: 0, hand_number: state.handNumber })

      const nextState = {
        ...state,
        pot: state.pot + increment,
        lastBetSize: raiseIncrement > 0 ? raiseIncrement : state.lastBetSize,
        streetAggressionCount,
        lastRaisePlayerIndex:
          newMax > previousMaxBet ? playerIndex : state.lastRaisePlayerIndex,
        players: newPlayers,
      }

      return finalizePlayerAction(nextState, newPlayers, playerIndex)
    }

    case 'CALL': {
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'CALL')) return state

      const maxBet = Math.max(
        0,
        ...state.players.filter((p) => !p.hasFolded && !p.bustedOut).map((p) => p.currentBet),
      )
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

      const { bbIdx } = getBlindIndices(state.players, state.dealerIndex, state.headsUpStreak ?? 0)
      const maxBet = Math.max(
        0,
        ...state.players.filter((p) => !p.hasFolded && !p.bustedOut).map((p) => p.currentBet),
      )

      if (state.currentStreet === 'preflop') {
        if (playerIndex !== bbIdx) return state
        if (!state.bigBlind || maxBet !== state.bigBlind) return state
      }

      track('check_selected', { hand_number: state.handNumber })
      return finalizePlayerAction({ ...state }, state.players, playerIndex)
    }

    case 'FOLD': {
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      if (playerIndex < 0) return state
      if (!assertTurn(state, playerIndex, 'FOLD')) return state

      const maxBet = Math.max(
        0,
        ...state.players.filter((p) => !p.hasFolded && !p.bustedOut).map((p) => p.currentBet),
      )
      const player = state.players[playerIndex]
      if (maxBet === 0) {
        track('fold_blocked', { reason: 'no_wager', hand_number: state.handNumber })
        return state
      }
      if (player.currentBet >= maxBet) {
        track('fold_blocked', { reason: 'no_call_required', hand_number: state.handNumber })
        return state
      }

      track('player_folded', { hand_number: state.handNumber })
      const newPlayers = state.players.map((p) => (p.id === action.id ? { ...p, hasFolded: true } : p))
      return finalizePlayerAction({ ...state }, newPlayers, playerIndex)
    }

    case 'ROTATE_DEALER': {
      if (state.screen !== 'setup') {
        track('dealer_rotate_blocked', { screen: state.screen })
        return state
      }
      if (state.players.length === 0) return state
      return { ...state, dealerIndex: nextDealerIndexAfterHand(state.players, state.dealerIndex) }
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
        lastRaisePlayerIndex: null,
        players: state.players.map((p) => {
          const newStack = p.id === action.winnerId ? p.currentStack + state.pot : p.currentStack
          return { ...p, currentStack: newStack, bustedOut: newStack === 0 }
        }),
      }
    }

    case 'AWARD_SPLIT_POT': {
      const { winnerIds } = action
      const share = Math.floor(state.pot / winnerIds.length)
      const remainder = state.pot % winnerIds.length
      track('split_pot_awarded', { split_count: winnerIds.length, pot_amount: state.pot, hand_number: state.handNumber })
      track('hand_completed', { hand_number: state.handNumber, split_pot: true, split_count: winnerIds.length })
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
        lastRaisePlayerIndex: null,
        players: state.players.map((p) => {
          const newStack = winnerIds.includes(p.id) ? p.currentStack + share : p.currentStack
          return {
            ...p,
            currentStack: newStack,
            currentBet: 0,
            hasFolded: false,
            bustedOut: newStack === 0,
          }
        }),
      }
    }

    case 'NEXT_HAND': {
      if (state.players.filter((p) => !p.bustedOut).length < 2) return state
      const handNumber = state.handNumber + 1
      if (handNumber === 2) track('second_hand_started', { hand_number: handNumber })
      track('hand_started', { hand_number: handNumber })
      const { dealerIndex: nd, headsUpStreak: nh } = nextHuState(
        state.players,
        state.dealerIndex,
        state.headsUpStreak,
      )
      const basePlayers = state.players.map((p) => ({
        ...p,
        currentBet: 0,
        hasFolded: false,
        isAllIn: false,
      }))
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
        lastRaisePlayerIndex: null,
        pendingStreetPrompt: null,
        firstActorIndex: null,
        activePlayerIndex: null,
        players: basePlayers,
      }
      return applySoleActorAutoPasses(applyPostBlinds(baseState))
    }

    default:
      return state
  }
}
