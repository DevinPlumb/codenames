import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { toast, Toaster } from 'react-hot-toast'
import { GameSummary, Player } from '../types/game'
import NewGameModal from '../components/NewGameModal'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const session = useSession()
  const router = useRouter()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const supabase = useSupabaseClient()
  const [showNewGameModal, setShowNewGameModal] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    anthropic: false
  })

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
      setApiStatus({
        openai: data.openaiApiKey,
        anthropic: data.anthropicKey
      })
      setHasApiKey(!!(data.openaiApiKey || data.anthropicKey))
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleCreateGame = async (
    team: 'red' | 'blue',
    role: 'spymaster' | 'operative',
    aiModels: {
      redSpymaster?: string
      blueSpymaster?: string
      redOperative?: string
      blueOperative?: string
    }
  ) => {
    try {
      setLoading(true)
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team,
          role,
          aiModels
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || errorData.message || 'Failed to create game')
      }

      const game = await res.json()
      router.push(`/game/${game.id}`)
    } catch (error) {
      console.error('Error creating game:', error)
      // Show error to user
      toast.error(error instanceof Error ? error.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="w-full max-w-[400px] p-4">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['github']}
          />
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

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
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155'
          }
        }}
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-mono font-bold text-slate-200">
                Welcome, {session.user.email}
              </h1>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    apiStatus.openai 
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                      : 'bg-slate-500'
                  }`} />
                  <p className="text-sm font-mono text-slate-400">
                    OpenAI {apiStatus.openai ? 'Connected' : 'Not Set'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    apiStatus.anthropic 
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                      : 'bg-slate-500'
                  }`} />
                  <p className="text-sm font-mono text-slate-400">
                    Anthropic {apiStatus.anthropic ? 'Connected' : 'Not Set'}
                  </p>
                </div>
              </div>
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
          {!hasApiKey ? (
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">
                Please add an OpenAI or Anthropic API key in settings to play
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowNewGameModal(true)}
              className="w-full px-4 py-3 bg-emerald-500/80 text-white rounded-xl font-mono 
                       hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
            >
              New Game
            </button>
          )}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-mono font-bold text-slate-200 mb-4">Ongoing Games</h2>
          <div className="space-y-4">
            {games
              .filter(game => !game.completedAt)
              .map(game => (
                <div
                  key={game.id}
                  onClick={() => hasApiKey && router.push(`/game/${game.id}`)}
                  className={`bg-slate-800/50 p-4 rounded-lg ${
                    hasApiKey 
                      ? 'cursor-pointer hover:bg-slate-800/70 transition-all' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
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
            {games.filter(game => !game.completedAt).length === 0 && (
              <p className="text-slate-400 font-mono text-sm">No ongoing games</p>
            )}
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