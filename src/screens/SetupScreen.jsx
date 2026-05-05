import { useState } from 'react'
import { useGame } from '../App'
import { getBlindIndices } from '../reducer'

export default function SetupScreen() {
  const { state, dispatch } = useGame()
  const [name, setName] = useState('')
  const [buyIn, setBuyIn] = useState('')
  const [smallBlind, setSmallBlind] = useState('')
  const [bigBlind, setBigBlind] = useState('')
  const [errors, setErrors] = useState({})

  function validatePlayer() {
    const errs = {}
    if (!name.trim()) errs.name = 'Player name is required'
    const amount = Number(buyIn)
    if (!buyIn.trim() || isNaN(amount) || amount <= 0) {
      errs.buyIn = 'Enter a valid buy-in amount'
    }
    return errs
  }

  function handleAdd() {
    const errs = validatePlayer()
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

  function validateBlinds() {
    const sb = Number(smallBlind)
    const bb = Number(bigBlind)
    const errs = {}
    if (!smallBlind.trim() || isNaN(sb) || sb <= 0) errs.smallBlind = 'Enter a valid small blind'
    if (!bigBlind.trim() || isNaN(bb) || bb <= 0) errs.bigBlind = 'Enter a valid big blind'
    if (!errs.smallBlind && !errs.bigBlind && bb < sb) errs.bigBlind = 'Big blind must be ≥ small blind'
    return errs
  }

  function handleStart() {
    if (state.players.filter((p) => !p.bustedOut).length < 2) return
    const blindErrs = validateBlinds()
    if (Object.keys(blindErrs).length > 0) {
      setErrors((prev) => ({ ...prev, ...blindErrs }))
      return
    }
    dispatch({ type: 'SET_BLINDS', smallBlind: Number(smallBlind), bigBlind: Number(bigBlind) })
    dispatch({ type: 'START_GAME' })
  }

  const blindsValid = (() => {
    const sb = Number(smallBlind)
    const bb = Number(bigBlind)
    return smallBlind.trim() && bigBlind.trim() && !isNaN(sb) && !isNaN(bb) && sb > 0 && bb >= sb
  })()

  const playersInGame = state.players.filter((p) => !p.bustedOut)
  const canStart = playersInGame.length >= 2 && blindsValid

  const { sbIdx, bbIdx } =
    state.players.length > 0
      ? getBlindIndices(state.players, state.dealerIndex, 0)
      : { sbIdx: -1, bbIdx: -1 }

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
            {state.players.map((p, i) => {
              const roles = p.bustedOut ? [] : []
              if (!p.bustedOut) {
                if (i === state.dealerIndex) roles.push('DEALER')
                if (i === sbIdx) roles.push('SMALL BLIND')
                if (i === bbIdx) roles.push('BIG BLIND')
              }
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    p.bustedOut ? 'bg-zinc-950/80 border border-zinc-800 opacity-60' : 'bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className={`text-sm font-medium ${p.bustedOut ? 'text-zinc-500' : ''}`}>
                      {p.name}
                    </span>
                    {roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap"
                      >
                        {r}
                      </span>
                    ))}
                    {p.bustedOut && (
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Busted Out
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-zinc-400">${p.currentStack}</span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'REMOVE_PLAYER', id: p.id })}
                      className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                      aria-label="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {state.players.length >= 2 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'ROTATE_DEALER' })}
              className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 font-medium rounded-xl py-3 text-sm transition-colors"
            >
              Rotate dealer
            </button>
          )}
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl p-5 mb-6 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Blinds</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              className={`w-full bg-zinc-800 rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:ring-2 ${errors.smallBlind ? 'ring-2 ring-red-500' : 'focus:ring-zinc-600'}`}
              placeholder="Small blind"
              type="number"
              min="1"
              value={smallBlind}
              onChange={(e) => { setSmallBlind(e.target.value); setErrors((prev) => ({ ...prev, smallBlind: null })) }}
            />
            {errors.smallBlind && <p className="text-red-400 text-xs mt-1">{errors.smallBlind}</p>}
          </div>
          <div>
            <input
              className={`w-full bg-zinc-800 rounded-lg px-4 py-3 text-sm placeholder-zinc-500 outline-none focus:ring-2 ${errors.bigBlind ? 'ring-2 ring-red-500' : 'focus:ring-zinc-600'}`}
              placeholder="Big blind"
              type="number"
              min="1"
              value={bigBlind}
              onChange={(e) => { setBigBlind(e.target.value); setErrors((prev) => ({ ...prev, bigBlind: null })) }}
            />
            {errors.bigBlind && <p className="text-red-400 text-xs mt-1">{errors.bigBlind}</p>}
          </div>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className={`w-full font-semibold rounded-xl py-4 text-sm transition-colors ${canStart ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
      >
        {playersInGame.length < 2
          ? `Need ${2 - playersInGame.length} more player${2 - playersInGame.length === 1 ? '' : 's'} with chips to start`
          : !blindsValid
          ? 'Set blinds to start'
          : 'Start Game'}
      </button>
    </div>
  )
}
