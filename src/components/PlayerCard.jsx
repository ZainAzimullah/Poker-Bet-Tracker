import { useState } from 'react'
import { useGame } from '../App'

export default function PlayerCard({ player }) {
  const { state, dispatch } = useGame()
  const [bettingOpen, setBettingOpen] = useState(false)
  const [betInput, setBetInput] = useState('')
  const [betError, setBetError] = useState('')

  const anyWager = state.players.some((p) => !p.hasFolded && p.currentBet > 0)

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

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="font-medium text-sm">{player.name}</p>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Stack: <span className="text-white font-medium">${player.currentStack}</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">Bet: <span className="text-emerald-400 font-medium">${player.currentBet}</span></p>
        </div>
      </div>

      {bettingOpen ? (
        <div className="space-y-2">
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
            onClick={() => dispatch({ type: 'CHECK', id: player.id })}
            disabled={anyWager}
            className={`flex-1 text-sm font-medium rounded-lg py-2.5 transition-colors ${anyWager ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white'}`}
          >
            Check
          </button>
          <button
            onClick={() => setBettingOpen(true)}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            Bet
          </button>
          <button
            onClick={() => dispatch({ type: 'FOLD', id: player.id })}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            Fold
          </button>
        </div>
      )}
    </div>
  )
}
