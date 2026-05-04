import { useGame } from '../App'
import PlayerCard from '../components/PlayerCard'

const STREET_LABEL = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

export default function GameplayScreen() {
  const { state, dispatch } = useGame()

  const streetLabel = state.currentStreet ? STREET_LABEL[state.currentStreet] : null

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pot</p>
        <p className="text-5xl font-bold tracking-tight">${state.pot}</p>
        <p className="text-xs text-zinc-600 mt-2">Hand {state.handNumber}</p>
        {streetLabel && (
          <p className="text-xs text-zinc-500 mt-1 font-medium uppercase tracking-widest">{streetLabel}</p>
        )}
        {state.smallBlind && state.bigBlind && (
          <p className="text-xs text-zinc-700 mt-1">Blinds: ${state.smallBlind}/${state.bigBlind}</p>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {state.players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => dispatch({ type: 'NEXT_PLAYER' })}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 font-medium rounded-xl py-3 text-xs transition-colors"
        >
          Next player →
        </button>
        {state.currentStreet && state.currentStreet !== 'river' && (
          <button
            onClick={() => dispatch({ type: 'ADVANCE_STREET' })}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 font-medium rounded-xl py-3 text-xs transition-colors"
          >
            Next street →
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'ROTATE_DEALER' })}
          className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-500 font-medium rounded-xl py-3 px-4 text-xs transition-colors"
        >
          Rotate dealer
        </button>
      </div>

      <button
        onClick={() => dispatch({ type: 'END_HAND' })}
        className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 font-medium rounded-xl py-4 text-sm transition-colors"
      >
        End Hand
      </button>
    </div>
  )
}
