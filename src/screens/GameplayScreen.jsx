import { useGame } from '../App'
import PlayerCard from '../components/PlayerCard'

const STREET_LABEL = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

const PROMPT_COPY = {
  flop: {
    title: 'Deal the flop',
    body: 'Physically deal the three flop cards, then confirm here once they are on the table.',
  },
  turn: {
    title: 'Deal the turn',
    body: 'Deal the turn card, then confirm here once it has been placed.',
  },
  river: {
    title: 'Deal the river',
    body: 'Deal the river card, then confirm here once it has been placed.',
  },
}

export default function GameplayScreen() {
  const { state, dispatch } = useGame()

  const streetLabel = state.currentStreet ? STREET_LABEL[state.currentStreet] : null
  const pending = state.pendingStreetPrompt

  return (
    <div className="max-w-md mx-auto px-4 py-8 relative">
      {pending && PROMPT_COPY[pending] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="street-prompt-title"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 id="street-prompt-title" className="text-lg font-semibold text-center mb-2">
              {PROMPT_COPY[pending].title}
            </h2>
            <p className="text-sm text-zinc-400 text-center mb-6 leading-relaxed">
              {PROMPT_COPY[pending].body}
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CONFIRM_NEXT_STREET' })}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

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

      <button
        onClick={() => dispatch({ type: 'END_HAND' })}
        className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 font-medium rounded-xl py-4 text-sm transition-colors"
      >
        End Hand
      </button>
    </div>
  )
}
