import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import AuthComponent from '../components/Auth'
import AuthDebug from '../components/AuthDebug'
import { useRouter } from 'next/router'

export default function Settings() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (session?.user) {
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      const data = await res.json()
      if (data?.openaiApiKey) {
        setApiKey(data.openaiApiKey)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: apiKey }),
      })

      if (!res.ok) throw new Error('Failed to save settings')
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000) // Clear message after 3 seconds
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!session) {
    return <AuthComponent />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                       hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
            >
              ← Back to Home
            </button>
            <h1 className="text-2xl font-mono font-bold text-slate-200">Settings</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                     hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            Sign Out
          </button>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg">
          <label className="block mb-2 font-mono text-sm text-slate-400">OpenAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl font-mono text-sm 
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
          <button
            onClick={saveSettings}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-emerald-500/80 text-white rounded-xl font-mono 
                     hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] 
                     disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          {message && (
            <p className={`mt-3 text-sm font-mono ${
              message.includes('Error') ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 