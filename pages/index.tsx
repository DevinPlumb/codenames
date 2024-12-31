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
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="w-full max-w-[400px] p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-lg">
          <h1 className="text-2xl font-mono font-bold text-slate-200 mb-6 text-center">
            Welcome to Codenames
          </h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#10b981', // emerald-500
                    brandAccent: '#059669', // emerald-600
                    inputBackground: 'rgb(30 41 59 / 0.5)', // slate-800/50
                    inputBorder: 'rgb(51 65 85)', // slate-700
                    inputText: '#e2e8f0', // slate-200
                  },
                },
              },
              className: {
                container: 'font-mono',
                button: '!bg-emerald-500/80 hover:!bg-emerald-600/80 !transition-all !duration-200 !font-mono',
                input: `!bg-slate-800/50 !border-slate-700 !font-mono !text-slate-200
                  [-webkit-appearance:none]
                  [-webkit-box-shadow:0_0_0_30px_rgba(15_23_42_/_1)_inset_!important]
                  [-webkit-text-fill-color:rgb(226_232_240)_!important]
                  [&:-webkit-autofill]:[background-color:rgba(15_23_42_/_1)_!important]
                  [&:-webkit-autofill]:[color:rgb(226_232_240)_!important]
                  [&:-webkit-autofill]:!font-mono
                  [&:-webkit-autofill]:!font-[ui-monospace]
                  [&:-webkit-autofill_-internal-autofill-selected]:!font-mono`,
                label: '!font-mono !text-slate-400',
                anchor: '!font-mono !text-emerald-500 hover:!text-emerald-400',
                message: '!font-mono !text-slate-400',
                divider: '!font-mono !text-slate-400'
              },
            }}
            providers={[]}
            magicLink={true}
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
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-mono font-bold text-slate-200">
                Welcome, {session.user.email}
              </h1>
              <div className="flex flex-wrap gap-4 mt-2">
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
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => router.push('/settings')}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg whitespace-nowrap"
              >
                Settings
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg whitespace-nowrap"
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

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg mb-8">
          <h2 className="text-xl font-mono font-bold text-slate-200 mb-4">Ongoing Games</h2>
          <div className="space-y-6">
            {Object.entries(
              games
                .filter(game => !game.completedAt)
                .reduce((acc, game) => {
                  const date = new Date(game.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                  if (!acc[date]) acc[date] = []
                  acc[date].push(game)
                  return acc
                }, {} as Record<string, typeof games>)
            )
              .sort(([dateA, _], [dateB, __]) => 
                new Date(dateB).getTime() - new Date(dateA).getTime()
              )
              .map(([date, dateGames]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-mono text-slate-500 border-b border-slate-800 pb-2">{date}</h3>
                  <div className="space-y-3">
                    {dateGames
                      .sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map(game => {
                        const playerTeam = game.players.find((p: Player) => p.userId === session.user.id)?.team
                        const playerRole = game.players.find((p: Player) => p.userId === session.user.id)?.role
                        return (
                          <div
                            key={game.id}
                            onClick={() => hasApiKey && router.push(`/game/${game.id}`)}
                            className={`bg-slate-800/50 p-4 rounded-lg ${
                              hasApiKey 
                                ? 'cursor-pointer hover:bg-slate-800/70 transition-all' 
                                : 'opacity-50 cursor-not-allowed'
                            } border-2 ${playerTeam === 'red' ? 'border-red-500/20' : 'border-blue-500/20'}`}
                          >
                            <div className="flex justify-between items-center font-mono">
                              <div className="flex items-center gap-2">
                                {playerRole === 'spymaster' ? (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                                <span className="text-sm text-slate-400">
                                  {new Date(game.createdAt).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            {games.filter(game => !game.completedAt).length === 0 && (
              <p className="text-slate-400 font-mono text-sm">No ongoing games</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-xl font-mono font-bold text-slate-200 mb-4">Completed Games</h2>
          <div className="space-y-6">
            {Object.entries(
              games
                .filter(game => game.completedAt)
                .reduce((acc, game) => {
                  const date = new Date(game.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                  if (!acc[date]) acc[date] = []
                  acc[date].push(game)
                  return acc
                }, {} as Record<string, typeof games>)
            )
              .sort(([dateA, _], [dateB, __]) => 
                new Date(dateB).getTime() - new Date(dateA).getTime()
              )
              .map(([date, dateGames]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-mono text-slate-500 border-b border-slate-800 pb-2">{date}</h3>
                  <div className="space-y-3">
                    {dateGames
                      .sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map(game => {
                        const playerTeam = game.players.find((p: Player) => p.userId === session.user.id)?.team
                        const playerRole = game.players.find((p: Player) => p.userId === session.user.id)?.role
                        const didWin = game.winner === playerTeam
                        return (
                          <div
                            key={game.id}
                            onClick={() => router.push(`/game/${game.id}`)}
                            className={`bg-slate-800/50 p-4 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-all
                                      border-2 ${playerTeam === 'red' ? 'border-red-500/20' : 'border-blue-500/20'}`}
                          >
                            <div className="flex justify-between items-center font-mono">
                              <div className="flex items-center gap-2">
                                {playerRole === 'spymaster' ? (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                                <span className="text-sm text-slate-400">
                                  {new Date(game.createdAt).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {game.winner && (
                                <span className={`text-sm ${didWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {didWin ? 'Win' : 'Loss'}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            {games.filter(game => game.completedAt).length === 0 && (
              <p className="text-slate-400 font-mono text-sm">No completed games</p>
            )}
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