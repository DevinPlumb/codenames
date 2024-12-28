import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AuthComponent from '../../components/Auth'
import { Card } from '../../utils/game'
import { Player } from '../../types/game'
import TurnTimer from '../../components/TurnTimer'
import ClueInput from '../../components/ClueInput'

interface GameData {
  id: string
  currentTeam: 'red' | 'blue'
  gameState: {
    cards: Card[]
  }
  winner: string | null
  endReason: string | null
  players: Player[]
  turnStartedAt: string
  currentClue: string | null
  currentNumber: number | null
}

export default function GamePage() {
  const session = useSession()
  const router = useRouter()
  const { id } = router.query
  const [game, setGame] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && id) {
      loadGame()
    } else if (session && !loading) {
      // If we have a session but no game loaded, redirect home
      router.push('/')
    }
  }, [session, id])

  const loadGame = async () => {
    try {
      const res = await fetch(`/api/games/${id}`)
      if (!res.ok) throw new Error('Failed to load game')
      const data = await res.json()
      if (!data) throw new Error('Game not found')
      
      // Check if user is a player in this game
      const isPlayer = data.players.some((p: Player) => p.userId === session?.user.id)
      if (!isPlayer) {
        router.push('/')
        return
      }
      
      setGame(data)
    } catch (error) {
      console.error('Error loading game:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = async (index: number) => {
    if (!game || !session || !game.players) return
    
    const playerTeam = game.players.find((p: Player) => p.userId === session.user.id)?.team
    if (!playerTeam || game.currentTeam !== playerTeam) return
    
    const newCards = [...game.gameState.cards]
    const card = newCards[index]
    
    if (!card.revealed && !game.winner) {
      card.revealed = true

      let winner = null
      let endReason = null
      let nextTeam = game.currentTeam

      // Check win conditions
      if (card.type === 'assassin') {
        winner = game.currentTeam === 'red' ? 'blue' : 'red'
        endReason = 'assassin'
      } else {
        const redRemaining = newCards.filter(c => c.type === 'red' && !c.revealed).length
        const blueRemaining = newCards.filter(c => c.type === 'blue' && !c.revealed).length

        if (redRemaining === 0) {
          winner = 'red'
          endReason = 'all-cards-found'
        } else if (blueRemaining === 0) {
          winner = 'blue'
          endReason = 'all-cards-found'
        } else if (card.type !== game.currentTeam) {
          nextTeam = game.currentTeam === 'red' ? 'blue' : 'red'
        }
      }

      try {
        const res = await fetch(`/api/games/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameState: { cards: newCards },
            currentTeam: nextTeam,
            winner,
            endReason,
            currentClue: nextTeam !== game.currentTeam ? null : game.currentClue,
            currentNumber: nextTeam !== game.currentTeam ? null : game.currentNumber,
            move: {
              cardIndex: index,
              cardType: card.type,
              teamTurn: game.currentTeam
            }
          })
        })
        const updatedGame = await res.json()
        if (!updatedGame.players) {
          throw new Error('Invalid game data received')
        }
        setGame(updatedGame)
      } catch (error) {
        console.error('Error updating game:', error)
      }
    }
  }

  const handleEndTurn = async () => {
    if (!game || game.winner) return

    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTeam: game.currentTeam === 'red' ? 'blue' : 'red',
          gameState: game.gameState,
          currentClue: null,
          currentNumber: null
        })
      })
      const updatedGame = await res.json()
      setGame(updatedGame)
    } catch (error) {
      console.error('Error ending turn:', error)
    }
  }

  const handleSubmitClue = async (word: string, number: number) => {
    if (!game || !session) return
    
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentClue: word,
          currentNumber: number,
          clueGiver: session.user.id,
          gameState: game.gameState
        })
      })
      const updatedGame = await res.json()
      setGame(updatedGame)
    } catch (error) {
      console.error('Error submitting clue:', error)
    }
  }

  if (!session) return <AuthComponent />
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <p className="text-slate-200 font-mono">Loading game...</p>
    </div>
  )
  if (!game || !game.players) return null

  const playerTeam = game.players.find((p: Player) => p.userId === session.user.id)?.team
  const playerRole = game.players.find((p: Player) => p.userId === session.user.id)?.role
  if (!playerTeam || !playerRole) return null

  const isSpymaster = playerRole === 'spymaster'
  const isCurrentTeamsTurn = game.currentTeam === playerTeam

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Game header */}
        <div className="flex flex-col gap-4 mb-6 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                ← Back
              </button>
              <div className={`font-mono text-xl ${
                game.currentTeam === 'red' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {game.currentTeam === 'red' ? 'Red Team\'s Turn' : 'Blue Team\'s Turn'}
              </div>
              {!game.winner && (
                <TurnTimer
                  duration={120}
                  onTimeUp={handleEndTurn}
                  turnStartedAt={game.turnStartedAt}
                />
              )}
            </div>
            {!game.winner && game.currentTeam === playerTeam && (
              <button
                onClick={handleEndTurn}
                className={`px-4 py-2 rounded-xl font-mono border transition-all duration-200 hover:scale-[1.02] shadow-lg ${
                  game.currentTeam === 'red' 
                    ? 'bg-red-500/80 hover:bg-red-600/80 text-white border-red-700/50' 
                    : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-700/50'
                }`}
              >
                End Turn
              </button>
            )}
          </div>
          
          {/* Clue input for spymaster */}
          {isSpymaster && isCurrentTeamsTurn && !game.winner && !game.currentClue && (
            <ClueInput
              onSubmitClue={handleSubmitClue}
              disabled={!!game.currentClue}
            />
          )}

          {/* Current clue display - moved outside of condition to be always visible */}
          {game.currentClue && (
            <div className="font-mono text-slate-200 text-center">
              <span className={`font-bold ${game.currentTeam === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                {game.currentTeam.toUpperCase()} Team's Clue:
              </span>{' '}
              <span className="text-emerald-400 font-bold">{game.currentClue}</span>{' '}
              <span className="text-slate-400">(pointing to</span>{' '}
              <span className="text-emerald-400 font-bold">{game.currentNumber}</span>{' '}
              <span className="text-slate-400">words)</span>
            </div>
          )}
        </div>

        {/* Game board */}
        <div className="grid grid-cols-5 gap-4">
          {game.gameState.cards.map((card, index) => (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              disabled={
                card.revealed || 
                game.winner !== null || 
                game.currentTeam !== playerTeam ||
                isSpymaster ||  // Spymaster can't click
                (!isSpymaster && !game.currentClue) // Operatives need a clue to click
              }
              className={`aspect-[3/2] p-4 font-mono text-center transition-all duration-200 
                         border shadow-lg rounded-xl hover:scale-[1.02] disabled:hover:scale-100 ${
                card.revealed || isSpymaster
                  ? card.type === 'red'
                    ? 'bg-red-500/80 text-white border-red-700/50'
                    : card.type === 'blue'
                    ? 'bg-blue-500/80 text-white border-blue-700/50'
                    : card.type === 'assassin'
                    ? 'bg-black text-white border-slate-700'
                    : 'bg-slate-600/80 text-slate-200 border-slate-700/50'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border-slate-700 backdrop-blur-sm'
              }`}
            >
              <span className="text-sm">{card.word}</span>
            </button>
          ))}
        </div>

        {/* Game Over Modal */}
        {game.winner && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-xl text-center shadow-lg max-w-md mx-4">
              <h2 className="text-2xl font-mono font-bold mb-4 text-slate-200">Game Over!</h2>
              <p className="mb-6 font-mono text-slate-400">
                {game.endReason === 'assassin' ? (
                  <>The assassin was revealed! </>
                ) : (
                  <>All cards found! </>
                )}
                <span className={`font-bold ${
                  game.winner === 'red' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {game.winner.toUpperCase()} team wins!
                </span>
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 