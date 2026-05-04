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
  players: [],
}

let nextId = 1

const NEXT_STREET = { preflop: 'flop', flop: 'turn', turn: 'river', river: null }

function nextEligibleIndex(players, fromIndex) {
  const count = players.length
  for (let i = 1; i <= count; i++) {
    const idx = (fromIndex + i) % count
    if (!players[idx].hasFolded && !players[idx].isAllIn) return idx
  }
  return fromIndex
}

function applyPostBlinds(state) {
  if (!state.smallBlind || !state.bigBlind) return state
  const { players, dealerIndex, smallBlind, bigBlind } = state
  const count = players.length
  const sbIdx = (dealerIndex + 1) % count
  const bbIdx = (dealerIndex + 2) % count
  let pot = state.pot

  const newPlayers = players.map((p, idx) => {
    if (idx === sbIdx) {
      const amount = Math.min(smallBlind, p.currentStack)
      pot += amount
      return { ...p, currentStack: p.currentStack - amount, currentBet: p.currentBet + amount, isAllIn: p.currentStack <= smallBlind }
    }
    if (idx === bbIdx) {
      const amount = Math.min(bigBlind, p.currentStack)
      pot += amount
      return { ...p, currentStack: p.currentStack - amount, currentBet: p.currentBet + amount, isAllIn: p.currentStack <= bigBlind }
    }
    return p
  })

  return { ...state, pot, players: newPlayers }
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
      const basePlayers = state.players.map((p) => ({ ...p, currentBet: 0, hasFolded: false, isAllIn: false }))
      const baseState = {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        currentStreet: 'preflop',
        lastBetSize: 0,
        activePlayerIndex: nextEligibleIndex(basePlayers, state.dealerIndex),
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
      const previousMaxBet = Math.max(0, ...state.players.filter((p) => !p.hasFolded).map((p) => p.currentBet))
      const newLastBetSize = previousMaxBet > 0 ? amount - previousMaxBet : amount

      const newPlayers = state.players.map((p) => {
        if (p.id !== id) return p
        const newStack = p.currentStack - amount
        return { ...p, currentStack: newStack, currentBet: p.currentBet + amount, isAllIn: newStack === 0 }
      })

      const newActiveIndex = state.activePlayerIndex !== null
        ? nextEligibleIndex(newPlayers, playerIndex)
        : null

      const isAllIn = newPlayers[playerIndex].isAllIn
      track('bet_placed', { bet_amount: amount, hand_number: state.handNumber, player_stack: newPlayers[playerIndex].currentStack })
      if (isAllIn) track('all_in_placed', { player_stack: 0, hand_number: state.handNumber })

      return {
        ...state,
        pot: state.pot + amount,
        lastBetSize: newLastBetSize,
        activePlayerIndex: newActiveIndex,
        players: newPlayers,
      }
    }

    case 'CALL': {
      const maxBet = Math.max(0, ...state.players.filter((p) => !p.hasFolded).map((p) => p.currentBet))
      const player = state.players.find((p) => p.id === action.id)
      if (!player) return state
      const callAmount = Math.min(maxBet - player.currentBet, player.currentStack)
      if (callAmount <= 0) return state

      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      const newPlayers = state.players.map((p) => {
        if (p.id !== action.id) return p
        const newStack = p.currentStack - callAmount
        return { ...p, currentStack: newStack, currentBet: p.currentBet + callAmount, isAllIn: newStack === 0 }
      })

      const newActiveIndex = state.activePlayerIndex !== null
        ? nextEligibleIndex(newPlayers, playerIndex)
        : null

      const isAllIn = newPlayers[playerIndex].isAllIn
      track('call_placed', { call_amount: callAmount, player_stack: newPlayers[playerIndex].currentStack, hand_number: state.handNumber })
      if (isAllIn) track('all_in_placed', { player_stack: 0, hand_number: state.handNumber })

      return {
        ...state,
        pot: state.pot + callAmount,
        activePlayerIndex: newActiveIndex,
        players: newPlayers,
      }
    }

    case 'CHECK': {
      track('check_selected', { hand_number: state.handNumber })
      const newActiveIndex = state.activePlayerIndex !== null
        ? nextEligibleIndex(state.players, state.activePlayerIndex)
        : null
      return { ...state, activePlayerIndex: newActiveIndex }
    }

    case 'FOLD': {
      track('player_folded', { hand_number: state.handNumber })
      const playerIndex = state.players.findIndex((p) => p.id === action.id)
      const newPlayers = state.players.map((p) => p.id === action.id ? { ...p, hasFolded: true } : p)
      const newActiveIndex = state.activePlayerIndex !== null
        ? nextEligibleIndex(newPlayers, playerIndex)
        : null
      return { ...state, players: newPlayers, activePlayerIndex: newActiveIndex }
    }

    case 'ROTATE_DEALER': {
      return { ...state, dealerIndex: (state.dealerIndex + 1) % state.players.length }
    }

    case 'NEXT_PLAYER': {
      if (state.activePlayerIndex === null) return state
      return { ...state, activePlayerIndex: nextEligibleIndex(state.players, state.activePlayerIndex) }
    }

    case 'ADVANCE_STREET': {
      const nextStreet = NEXT_STREET[state.currentStreet] ?? null
      track('street_advanced', { street_name: nextStreet, hand_number: state.handNumber })
      const newPlayers = state.players.map((p) => ({ ...p, currentBet: 0 }))
      return {
        ...state,
        currentStreet: nextStreet,
        lastBetSize: 0,
        activePlayerIndex: nextEligibleIndex(newPlayers, state.dealerIndex),
        players: newPlayers,
      }
    }

    case 'END_HAND': {
      return { ...state, screen: 'endHand' }
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
      const newDealerIndex = (state.dealerIndex + 1) % state.players.length
      const basePlayers = state.players.map((p) => ({ ...p, currentBet: 0, hasFolded: false, isAllIn: false }))
      const baseState = {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        winnerId: null,
        winnerIds: null,
        splitShare: null,
        dealerIndex: newDealerIndex,
        currentStreet: 'preflop',
        lastBetSize: 0,
        activePlayerIndex: nextEligibleIndex(basePlayers, newDealerIndex),
        players: basePlayers,
      }
      return applyPostBlinds(baseState)
    }

    default:
      return state
  }
}
