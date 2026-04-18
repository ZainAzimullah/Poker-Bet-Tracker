import { useGame } from '../App'

export default function HandCompleteScreen() {
  const { state, dispatch } = useGame()

  const winner = state.players.find((p) => p.id === state.winnerId)

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-4xl mb-2">🏆</p>
        <h2 className="text-xl font-bold">{winner?.name} wins</h2>
        <p className="text-emerald-400 font-semibold text-lg mt-1">${state.pot}</p>
      </div>

      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Updated stacks</p>
      <div className="space-y-2 mb-10">
        {state.players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${p.id === state.winnerId ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-zinc-900'}`}
          >
            <span className="text-sm font-medium">{p.name}</span>
            <span className={`text-sm font-semibold ${p.id === state.winnerId ? 'text-emerald-400' : 'text-zinc-300'}`}>
              ${p.currentStack}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => dispatch({ type: 'NEXT_HAND' })}
        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white font-semibold rounded-xl py-4 text-sm transition-colors"
      >
        Start Next Hand
      </button>
    </div>
  )
}
