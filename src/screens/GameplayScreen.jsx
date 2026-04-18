import { useGame } from '../App'
import PlayerCard from '../components/PlayerCard'

export default function GameplayScreen() {
  const { state, dispatch } = useGame()

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pot</p>
        <p className="text-5xl font-bold tracking-tight">${state.pot}</p>
        <p className="text-xs text-zinc-600 mt-2">Hand {state.handNumber}</p>
      </div>

      <div className="space-y-3 mb-8">
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
