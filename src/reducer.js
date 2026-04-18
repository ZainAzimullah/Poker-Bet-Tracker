import { track } from './analytics'

export const initialState = {
  screen: 'setup',
  handNumber: 0,
  pot: 0,
  players: [],
}

let nextId = 1

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
      }
      track('player_added', { number_of_players: state.players.length + 1 })
      track('buy_in_added', { player_stack: action.buyIn })
      return { ...state, players: [...state.players, player] }
    }

    case 'REMOVE_PLAYER': {
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
      }
    }

    case 'START_GAME': {
      const handNumber = 1
      track('game_started', { number_of_players: state.players.length })
      track('hand_started', { hand_number: handNumber })
      return { ...state, screen: 'gameplay', handNumber }
    }

    case 'PLACE_BET': {
      const amount = action.amount
      track('bet_placed', {
        bet_amount: amount,
        hand_number: state.handNumber,
        player_stack: state.players.find((p) => p.id === action.id)?.currentStack - amount,
      })
      return {
        ...state,
        pot: state.pot + amount,
        players: state.players.map((p) =>
          p.id === action.id
            ? { ...p, currentStack: p.currentStack - amount, currentBet: p.currentBet + amount }
            : p
        ),
      }
    }

    case 'CHECK': {
      track('check_selected', { hand_number: state.handNumber })
      return state
    }

    case 'FOLD': {
      track('player_folded', { hand_number: state.handNumber })
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, hasFolded: true } : p
        ),
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
        players: state.players.map((p) =>
          p.id === action.winnerId
            ? { ...p, currentStack: p.currentStack + state.pot }
            : p
        ),
      }
    }

    case 'NEXT_HAND': {
      const handNumber = state.handNumber + 1
      if (handNumber === 2) {
        track('second_hand_started')
      }
      track('hand_started', { hand_number: handNumber })
      return {
        ...state,
        screen: 'gameplay',
        handNumber,
        pot: 0,
        winnerId: null,
        players: state.players.map((p) => ({
          ...p,
          currentBet: 0,
          hasFolded: false,
        })),
      }
    }

    default:
      return state
  }
}
