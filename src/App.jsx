import { useReducer, createContext, useContext, useEffect } from 'react'
import { reducer, initialState } from './reducer'
import { track } from './analytics'
import SetupScreen from './screens/SetupScreen'
import GameplayScreen from './screens/GameplayScreen'
import EndHandScreen from './screens/EndHandScreen'
import HandCompleteScreen from './screens/HandCompleteScreen'

export const GameContext = createContext(null)

export function useGame() {
  return useContext(GameContext)
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

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
