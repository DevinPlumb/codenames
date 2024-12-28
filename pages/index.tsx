import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AuthComponent from '../components/Auth'
import { initializeGameBoard } from '../utils/game'
import { GameSummary, Player } from '../types/game'
import NewGameModal from '../components/NewGameModal'

export default function Home() {
  const session = useSession()
  const router = useRouter()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const [showNewGameModal, setShowNewGameModal] = useState(false)

  useEffect(() => {
    if (session) {
      loadGames()
      loadSettings()
    }
  }, [session])

  const loadGames = async () => {
    try {
      const res = await fetch('/api/games')
      const data = await res.json()
      setGames(data)
    } catch (error) {
      console.error('Error loading games:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      const data = await res.json()
      setApiKey(data?.openaiApiKey)
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleCreateGame = async (team: 'red' | 'blue', role: 'spymaster' | 'operative') => {
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team,
          role,
          gameState: initializeGameBoard()
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to create game')
      }

      const game = await res.json()
      if (!game?.id) {
        throw new Error('Invalid game data received')
      }

      setShowNewGameModal(false)
      await router.push(`/game/${game.id}`)
    } catch (err) {
      const error = err as Error
      console.error('Error creating game:', error)
      alert(error.message || 'Failed to create game')
    }
  }

  if (!session) return <AuthComponent />
  if (loading) return <div>Loading...</div>

  const stats = games.reduce((acc, game) => {
    const playerTeam = game.players.find((p: Player) => p.userId === session.user.id)?.team
    if (game.winner && playerTeam) {
      if (game.winner === playerTeam) acc.wins++
      else acc.losses++
    }
    return acc
  }, { wins: 0, losses: 0 })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-mono font-bold text-slate-200">
                Welcome, {session.user.email}
              </h1>
              <p className="text-sm font-mono text-slate-400 mt-1">
                API Key: {apiKey ? '••••••••' : 'Not set'}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                Settings
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <h1 className="text-2xl font-mono font-bold text-slate-200 mb-4">Game Stats</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-emerald-400 font-mono">Wins: {stats.wins}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-red-400 font-mono">Losses: {stats.losses}</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewGameModal(true)}
            className="w-full px-4 py-3 bg-emerald-500/80 text-white rounded-xl font-mono 
                     hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            New Game
          </button>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-mono font-bold text-slate-200 mb-4">Ongoing Games</h2>
          <div className="space-y-4">
            {games
              .filter(game => !game.completedAt)
              .map(game => (
                <div
                  key={game.id}
                  onClick={() => router.push(`/game/${game.id}`)}
                  className="bg-slate-800/50 p-4 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400">
                      Started {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                    <span className={game.players.find((p: Player) => 
                      p.userId === session.user.id)?.team === 'red' ? 
                      'text-red-400' : 'text-blue-400'}>
                      Playing as {game.players.find((p: Player) => 
                        p.userId === session.user.id)?.team.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-mono font-bold text-slate-200 mb-4">Completed Games</h2>
          <div className="space-y-4">
            {games
              .filter(game => game.completedAt)
              .map(game => (
                <div
                  key={game.id}
                  onClick={() => router.push(`/game/${game.id}`)}
                  className="bg-slate-800/50 p-4 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                    {game.winner && (
                      <span className={game.winner === 'red' ? 'text-red-400' : 'text-blue-400'}>
                        {game.winner.toUpperCase()} Won
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {showNewGameModal && (
          <NewGameModal
            onClose={() => setShowNewGameModal(false)}
            onCreateGame={handleCreateGame}
          />
        )}
      </div>
    </div>
  )
} 