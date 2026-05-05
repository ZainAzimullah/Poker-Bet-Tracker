import { useEffect, useState } from 'react'
import { useGame } from '../App'
import { playFunnyBoingSound } from '../gameSounds'

export default function EndHandScreen() {
  const { state, dispatch } = useGame()
  const [splitMode, setSplitMode] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const activePlayers = state.players.filter((p) => !p.hasFolded && !p.bustedOut)
  const foldedPlayers = state.players.filter((p) => p.hasFolded)

  function toggleSplitSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleAward() {
    if (splitMode) {
      if (selectedIds.length === 0) return
      dispatch({ type: 'AWARD_SPLIT_POT', winnerIds: selectedIds })
    } else {
      if (!selectedId) return
      dispatch({ type: 'AWARD_POT', winnerId: selectedId })
    }
  }

  function handleModeToggle(mode) {
    setSplitMode(mode === 'split')
    setSelectedId(null)
    setSelectedIds([])
  }

  const splitShare = selectedIds.length > 0 ? Math.floor(state.pot / selectedIds.length) : null
  const splitRemainder = selectedIds.length > 0 ? state.pot % selectedIds.length : null
  const canAward = splitMode ? selectedIds.length > 0 : !!selectedId

  useEffect(() => {
    playFunnyBoingSound()
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-center mb-1">Hand Complete</h2>
      <p className="text-center text-zinc-500 text-sm mb-8">Hand {state.handNumber}</p>

      <div className="text-center mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pot</p>
        <p className="text-5xl font-bold tracking-tight">${state.pot}</p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => handleModeToggle('single')}
          className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${!splitMode ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
        >
          One winner
        </button>
        <button
          onClick={() => handleModeToggle('split')}
          className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${splitMode ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
        >
          Split pot
        </button>
      </div>

      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Who won?</p>

      <div className="space-y-2 mb-4">
        {activePlayers.map((p) => {
          const isSelected = splitMode ? selectedIds.includes(p.id) : selectedId === p.id
          return (
            <button
              key={p.id}
              onClick={() => splitMode ? toggleSplitSelect(p.id) : setSelectedId(p.id)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-4 transition-colors ${isSelected ? 'bg-emerald-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
            >
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-sm text-zinc-400">Stack: ${p.currentStack}</span>
            </button>
          )
        })}
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

      {splitMode && splitShare !== null && splitRemainder !== null && (
        <div className="bg-zinc-900 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-sm text-zinc-300">
            ${splitShare} each
            {splitRemainder > 0 && (
              <span className="text-zinc-500"> · Remainder ${splitRemainder} stays in pot</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <button
          onClick={handleAward}
          disabled={!canAward}
          className={`w-full font-semibold rounded-xl py-4 text-sm transition-colors ${canAward ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
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
