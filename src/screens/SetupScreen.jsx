import { useState } from 'react'
import { useGame } from '../App'

export default function SetupScreen() {
  const { state, dispatch } = useGame()
  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Player name is required'
    const amount = Number(buyIn)
    if (!buyIn.trim() || isNaN(amount) || amount <= 0) {
      errs.buyIn = 'Enter a valid buy-in amount'
    }
    return errs
  }

  function handleAdd() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    dispatch({ type: 'ADD_PLAYER', name: name.trim(), buyIn: Number(buyIn) })
    setName('')
    setBuyIn('')
    setErrors({})
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  const canStart = state.players.length >= 2

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-center mb-8">Poker Tracker</h1>

      <div className="bg-zinc-900 rounded-2xl p-5 mb-6 space-y-3">
        <div>
          <input
            className={`w-full bg-zinc-800 rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:ring-2 ${errors.name ? 'ring-2 ring-red-500' : 'focus:ring-zinc-600'}`}
            placeholder="Player name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: null })) }}
            onKeyDown={handleKeyDown}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <input
            className={`w-full bg-zinc-800 rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:ring-2 ${errors.buyIn ? 'ring-2 ring-red-500' : 'focus:ring-zinc-600'}`}
            placeholder="Buy-in amount"
            type="number"
            min="1"
            value={buyIn}
            onChange={(e) => { setBuyIn(e.target.value); setErrors((prev) => ({ ...prev, buyIn: null })) }}
            onKeyDown={handleKeyDown}
          />
          {errors.buyIn && <p className="text-red-400 text-xs mt-1">{errors.buyIn}</p>}
        </div>

        <button
          onClick={handleAdd}
          className="w-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white font-medium rounded-lg py-3 text-sm transition-colors"
        >
          + Add player
        </button>
      </div>

      {state.players.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Players</p>
          <ul className="space-y-2">
            {state.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3">
                <span className="text-sm font-medium">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">${p.startingStack}</span>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_PLAYER', id: p.id })}
                    className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                    aria-label="Remove player"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => canStart && dispatch({ type: 'START_GAME' })}
        disabled={!canStart}
        className={`w-full font-semibold rounded-xl py-4 text-sm transition-colors ${canStart ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
      >
        {canStart ? 'Start Game' : `Add ${2 - state.players.length} more player${2 - state.players.length === 1 ? '' : 's'} to start`}
      </button>
    </div>
  )
}
