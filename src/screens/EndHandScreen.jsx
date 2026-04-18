import { useState } from 'react'
import { useGame } from '../App'

export default function EndHandScreen() {
  const { state, dispatch } = useGame()
  const [selectedId, setSelectedId] = useState(null)

  const activePlayers = state.players.filter((p) => !p.hasFolded)
  const foldedPlayers = state.players.filter((p) => p.hasFolded)

  function handleAward() {
    if (!selectedId) return
    dispatch({ type: 'AWARD_POT', winnerId: selectedId })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-center mb-1">Hand Complete</h2>
      <p className="text-center text-zinc-500 text-sm mb-8">Hand {state.handNumber}</p>

      <div className="text-center mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pot</p>
        <p className="text-5xl font-bold tracking-tight">${state.pot}</p>
      </div>

      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Who won?</p>

      <div className="space-y-2 mb-4">
        {activePlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`w-full flex items-center justify-between rounded-xl px-4 py-4 transition-colors ${selectedId === p.id ? 'bg-emerald-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
          >
            <span className="font-medium text-sm">{p.name}</span>
            <span className="text-sm text-zinc-400">Stack: ${p.currentStack}</span>
          </button>
        ))}
      </div>

      {foldedPlayers.length > 0 && (
        <div className="space-y-2 mb-4">
          {foldedPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3 opacity-40">
              <span className="text-sm">{p.name}</span>
              <span className="text-xs text-zinc-500">Folded — not eligible</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={handleAward}
          disabled={!selectedId}
          className={`w-full font-semibold rounded-xl py-4 text-sm transition-colors ${selectedId ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
        >
          Award Pot
        </button>

        <button
          onClick={() => dispatch({ type: 'CANCEL_END_HAND' })}
          className="w-full text-zinc-600 hover:text-zinc-400 text-xs py-2 transition-colors"
        >
          ← Back to game
        </button>
      </div>
    </div>
  )
}
