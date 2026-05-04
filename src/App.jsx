import { useReducer, createContext, useContext, useEffect } from 'react'
import { reducer, initialState } from './reducer'
import { track } from './analytics'
import {
  playChipSound,
  playCheckSound,
  playFoldSound,
  playPotAwardSound,
  playAllInSound,
} from './gameSounds'
import SetupScreen from './screens/SetupScreen'
import GameplayScreen from './screens/GameplayScreen'
import EndHandScreen from './screens/EndHandScreen'
import HandCompleteScreen from './screens/HandCompleteScreen'

export const GameContext = createContext(null)

export function useGame() {
  return useContext(GameContext)
}

function gameReducer(state, action) {
  const next = reducer(state, action)
  if (next !== state) {
    const prevAllIn = state.players?.filter((p) => p.isAllIn).length ?? 0
    const nextAllIn = next.players?.filter((p) => p.isAllIn).length ?? 0
    const becameAllIn =
      (action.type === 'PLACE_BET' || action.type === 'CALL') && nextAllIn > prevAllIn

    if (becameAllIn) {
      playAllInSound()
      return next
    }

    switch (action.type) {
      case 'PLACE_BET':
      case 'CALL':
        playChipSound()
        break
      case 'CHECK':
        playCheckSound()
        break
      case 'FOLD':
        playFoldSound()
        break
      case 'AWARD_POT':
      case 'AWARD_SPLIT_POT':
        playPotAwardSound()
        break
      default:
        break
    }
  }
  return next
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  useEffect(() => {
    track('game_setup_started')
  }, [])

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        {state.screen === 'setup' && <SetupScreen />}
        {state.screen === 'gameplay' && <GameplayScreen />}
        {state.screen === 'endHand' && <EndHandScreen />}
        {state.screen === 'handComplete' && <HandCompleteScreen />}
      </div>
    </GameContext.Provider>
  )
}
