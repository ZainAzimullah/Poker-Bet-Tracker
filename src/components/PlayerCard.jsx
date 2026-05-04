import { useState } from 'react'
import { useGame } from '../App'
import { getBlindIndices } from '../reducer'

function primaryVoluntaryBetLabel(streetAggressionCount, maxBet) {
  const nextLevel = streetAggressionCount + 1
  if (maxBet === 0) return 'Bet'
  if (nextLevel === 1) return 'Raise'
  if (nextLevel === 2) return '3-bet'
  return `${nextLevel + 1}-bet`
}

export default function PlayerCard({ player }) {
  const { state, dispatch } = useGame()
  const [bettingOpen, setBettingOpen] = useState(false)
  const [betInput, setBetInput] = useState('')
  const [betError, setBetError] = useState('')

  const playerIndex = state.players.findIndex((p) => p.id === player.id)
  const count = state.players.length

  // Dealer / SB / BB role (heads-up blind stagger)
  const dealerIdx = state.dealerIndex
  const streak = state.headsUpStreak ?? 0
  const { sbIdx, bbIdx } = getBlindIndices(dealerIdx, count, streak)
  const role = playerIndex === dealerIdx ? 'D' : playerIndex === sbIdx ? 'SB' : playerIndex === bbIdx ? 'BB' : null

  const streetBlocked = state.pendingStreetPrompt != null
  // Active player (strict turn order)
  const isActive =
    !streetBlocked && state.activePlayerIndex !== null && playerIndex === state.activePlayerIndex

  // Bet / call calculations
  const activePlayers = state.players.filter((p) => !p.hasFolded)
  const maxBet = Math.max(0, ...activePlayers.map((p) => p.currentBet))
  const callAmount = Math.min(maxBet - player.currentBet, player.currentStack)
  const showCall = maxBet > 0 && player.currentBet < maxBet
  const canCheck = player.currentBet >= maxBet

  // Min bet
  const minBet = maxBet > 0 ? (state.lastBetSize || state.bigBlind || null) : (state.bigBlind || null)
  const betVerb = primaryVoluntaryBetLabel(state.streetAggressionCount ?? 0, maxBet)

  function handleBetConfirm() {
    const amount = Number(betInput)
    if (!betInput.trim() || isNaN(amount) || amount <= 0) {
      setBetError('Enter a valid amount')
      return
    }
    if (amount > player.currentStack) {
      setBetError(`Max bet is $${player.currentStack}`)
      return
    }
    if (minBet && amount < player.currentStack && amount < minBet) {
      setBetError(`Min bet is $${minBet}`)
      return
    }
    dispatch({ type: 'PLACE_BET', id: player.id, amount })
    setBettingOpen(false)
    setBetInput('')
    setBetError('')
  }

  function handleBetCancel() {
    setBettingOpen(false)
    setBetInput('')
    setBetError('')
  }

  if (player.hasFolded) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-4 opacity-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{player.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Stack: ${player.currentStack}</p>
          </div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800 px-2 py-1 rounded-md">
            Folded
          </span>
        </div>
      </div>
    )
  }

  if (player.isAllIn) {
    return (
      <div className={`bg-zinc-900 rounded-2xl p-4 ${isActive ? 'ring-2 ring-amber-500/60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{player.name}</p>
            {role && (
              <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                {role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Stack: <span className="text-white font-medium">${player.currentStack}</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">Bet: <span className="text-emerald-400 font-medium">${player.currentBet}</span></p>
            </div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider bg-amber-900/40 border border-amber-700/50 px-2 py-1 rounded-md">
              All-in
            </span>
          </div>
        </div>
      </div>
    )
  }

  const cardClass = `bg-zinc-900 rounded-2xl p-4 transition-all ${isActive ? 'ring-2 ring-emerald-500/60' : 'opacity-70'}`

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{player.name}</p>
          {role && (
            <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
              {role}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Stack: <span className="text-white font-medium">${player.currentStack}</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">Bet: <span className="text-emerald-400 font-medium">${player.currentBet}</span></p>
        </div>
      </div>

      {bettingOpen ? (
        <div className="space-y-2">
          {maxBet > 0 && (
            <p className="text-xs text-zinc-500">Current bet: ${maxBet} · Amount to add</p>
          )}
          {minBet && (
            <p className="text-xs text-zinc-600">Min: ${minBet}</p>
          )}
          <div>
            <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden">
              <span className="pl-3 text-zinc-400 text-sm">$</span>
              <input
                autoFocus
                type="number"
                min="1"
                max={player.currentStack}
                className="flex-1 bg-transparent px-2 py-3 text-sm outline-none"
                placeholder="0"
                value={betInput}
                onChange={(e) => { setBetInput(e.target.value); setBetError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleBetConfirm()}
              />
            </div>
            {betError && <p className="text-red-400 text-xs mt-1">{betError}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBetConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleBetCancel}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => isActive && dispatch({ type: 'CHECK', id: player.id })}
            disabled={!canCheck || !isActive}
            className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${
              !canCheck || !isActive
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'
            }`}
          >
            Check
          </button>

          {showCall && (
            <button
              onClick={() => isActive && dispatch({ type: 'CALL', id: player.id })}
              disabled={!isActive}
              className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${
                isActive
                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {player.currentStack <= callAmount
                ? `All-in ($${player.currentStack})`
                : `Call $${callAmount}`}
            </button>
          )}

          <button
            onClick={() => isActive && setBettingOpen(true)}
            disabled={!isActive}
            className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${
              isActive
                ? 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {betVerb}
          </button>

          <button
            onClick={() => isActive && dispatch({ type: 'FOLD', id: player.id })}
            disabled={!isActive}
            className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${
              isActive
                ? 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            Fold
          </button>
        </div>
      )}
    </div>
  )
}
