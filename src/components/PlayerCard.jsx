import { useState } from 'react'
import { useGame } from '../App'
import { getBlindIndices } from '../reducer'

const ROLE_LABEL = {
  D: 'DEALER',
  SB: 'SMALL BLIND',
  BB: 'BIG BLIND',
}

function primaryVoluntaryBetLabel(streetAggressionCount, maxBet, openingStreet) {
  const nextLevel = streetAggressionCount + 1
  if (maxBet === 0 && openingStreet) return 'Bet'
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

  const dealerIdx = state.dealerIndex
  const streak = state.headsUpStreak ?? 0
  const { sbIdx, bbIdx } = getBlindIndices(state.players, dealerIdx, streak)
  const roleKey = playerIndex === dealerIdx ? 'D' : playerIndex === sbIdx ? 'SB' : playerIndex === bbIdx ? 'BB' : null
  const role = roleKey ? ROLE_LABEL[roleKey] : null
  const isBB = playerIndex === bbIdx

  const streetBlocked = state.pendingStreetPrompt != null
  const isActive =
    !player.bustedOut &&
    !streetBlocked &&
    state.activePlayerIndex !== null &&
    playerIndex === state.activePlayerIndex

  const activePlayers = state.players.filter((p) => !p.hasFolded && !p.bustedOut)
  const maxBet = Math.max(0, ...activePlayers.map((p) => p.currentBet))
  const callAmount = Math.min(maxBet - player.currentBet, player.currentStack)
  const showCall = maxBet > 0 && player.currentBet < maxBet
  /** Fold only when facing an unmatched wager (same signal as Call). */
  const showFold = showCall

  const canCheck =
    player.currentBet >= maxBet &&
    (state.currentStreet !== 'preflop' ||
      (isBB && state.bigBlind != null && maxBet === state.bigBlind))

  const bb = state.bigBlind || 1
  const minRaiseUnit = Math.max(state.lastBetSize || 0, bb)
  const minTotalRaise = maxBet > 0 ? maxBet + minRaiseUnit : bb

  const openBettingStreet =
    state.currentStreet && state.currentStreet !== 'preflop' && maxBet === 0

  const bbPreflopRaiseOption =
    state.currentStreet === 'preflop' &&
    isBB &&
    state.bigBlind != null &&
    maxBet === state.bigBlind &&
    player.currentBet >= maxBet

  const facingBet = maxBet > 0 && player.currentBet < maxBet
  const canRaiseWhenFacingBet = player.currentStack > callAmount

  const showVoluntaryBet =
    bbPreflopRaiseOption ||
    openBettingStreet ||
    (facingBet && canRaiseWhenFacingBet)

  const betVerb = primaryVoluntaryBetLabel(
    state.streetAggressionCount ?? 0,
    maxBet,
    openBettingStreet,
  )

  function handleBetConfirm() {
    const total = Number(betInput)
    if (!betInput.trim() || isNaN(total) || total <= 0) {
      setBetError('Enter a valid total')
      return
    }
    const maxCap = player.currentBet + player.currentStack
    if (total > maxCap) {
      setBetError(`Maximum total this street is $${maxCap}`)
      return
    }
    if (total <= player.currentBet) {
      setBetError('Total must exceed your current street wager')
      return
    }
    if (maxBet > 0 && total < maxBet) {
      setBetError('Use Call to match the current bet')
      return
    }
    if (maxBet > 0 && total === maxBet) {
      setBetError('Use Call to match — enter a higher total only to raise')
      return
    }
    if (maxBet === 0) {
      if (total < bb && total < maxCap) {
        setBetError(`Minimum total wager is $${bb}`)
        return
      }
    } else {
      const minR = maxBet + minRaiseUnit
      if (total < minR && total < maxCap) {
        setBetError(`Minimum raise total is $${minR} (or go all-in for $${maxCap})`)
        return
      }
    }
    dispatch({ type: 'PLACE_BET', id: player.id, targetStreetBet: total })
    setBettingOpen(false)
    setBetInput('')
    setBetError('')
  }

  function handleBetCancel() {
    setBettingOpen(false)
    setBetInput('')
    setBetError('')
  }

  if (player.bustedOut) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-4 opacity-50 border border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-zinc-500">{player.name}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Stack: $0</p>
          </div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/80 px-2 py-1 rounded-md shrink-0">
            Busted Out
          </span>
        </div>
      </div>
    )
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{player.name}</p>
            {role && (
              <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
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
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="font-medium text-sm">{player.name}</p>
          {role && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap">
              {role}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-400">Stack: <span className="text-white font-medium">${player.currentStack}</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">Bet: <span className="text-emerald-400 font-medium">${player.currentBet}</span></p>
        </div>
      </div>

      {bettingOpen ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-300 font-medium">
            {maxBet > 0 ? 'Raise to:' : 'Bet to:'}
          </p>
          <p className="text-xs text-zinc-500">Minimum: ${minTotalRaise}</p>
          <div>
            <div className="flex items-center bg-zinc-800 rounded-lg overflow-hidden">
              <span className="pl-3 text-zinc-400 text-sm">$</span>
              <input
                autoFocus
                type="number"
                min="1"
                step="1"
                className="flex-1 bg-transparent px-2 py-3 text-sm outline-none"
                placeholder=""
                aria-label={maxBet > 0 ? 'Raise to total' : 'Bet to total'}
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => isActive && dispatch({ type: 'CHECK', id: player.id })}
            disabled={!canCheck || !isActive}
            className={`flex-1 min-w-[4.5rem] text-sm font-medium rounded-lg py-2.5 transition-colors ${
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
              className={`flex-1 min-w-[4.5rem] text-sm font-medium rounded-lg py-2.5 transition-colors ${
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

          {showVoluntaryBet && (
            <button
              onClick={() => isActive && setBettingOpen(true)}
              disabled={!isActive}
              className={`flex-1 min-w-[4.5rem] text-sm font-medium rounded-lg py-2.5 transition-colors ${
                isActive
                  ? 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {betVerb}
            </button>
          )}

          {showFold && (
            <button
              onClick={() => isActive && dispatch({ type: 'FOLD', id: player.id })}
              disabled={!isActive}
              className={`flex-1 min-w-[4.5rem] text-sm font-medium rounded-lg py-2.5 transition-colors ${
                isActive
                  ? 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              Fold
            </button>
          )}
        </div>
      )}
    </div>
  )
}
