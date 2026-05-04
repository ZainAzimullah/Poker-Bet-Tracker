import { useReducer, createContext, useContext, useEffect } from 'react'
import { reducer, initialState } from './reducer'
import { track } from './analytics'
import {
  playChipSound,
  playCheckSound,
  playFoldSound,
  playShuffleSound,
  playDealCardsSound,
  playPotAwardSound,
  playAllInSound,
  cancelPendingCheckSound,
  initGameSounds,
  warmGameSoundsFromGesture,
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
      case 'START_GAME':
      case 'NEXT_HAND':
        playShuffleSound()
        break
      case 'CONFIRM_NEXT_STREET':
        // Prevent a delayed second "check" tap from sounding like it's tied to modal OK.
        cancelPendingCheckSound()
        if (state.pendingStreetPrompt === 'flop') {
          playDealCardsSound(3)
        } else if (state.pendingStreetPrompt === 'turn' || state.pendingStreetPrompt === 'river') {
          playDealCardsSound(1)
        }
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
    initGameSounds()
  }, [])

  useEffect(() => {
    let done = false
    const onFirstGesture = () => {
      if (done) return
      done = true
      warmGameSoundsFromGesture()
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
    }

    window.addEventListener('pointerdown', onFirstGesture, { passive: true })
    window.addEventListener('keydown', onFirstGesture)
    window.addEventListener('touchstart', onFirstGesture, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
    }
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
