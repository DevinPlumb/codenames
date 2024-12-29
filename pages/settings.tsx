import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import AuthComponent from '../components/Auth'
import AuthDebug from '../components/AuthDebug'
import { useRouter } from 'next/router'
import type { APIError } from '@/types/api'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ValidationResult {
  valid: boolean
  message: string
}

interface ValidationResponse {
  message: string
  validationResults: {
    openai: ValidationResult
    anthropic: ValidationResult
  }
}

export default function Settings() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState({
    openai: false,
    anthropic: false
  })
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadSettings().finally(() => setPageLoading(false))
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      const data = await res.json()
      setOpenaiKey(data.openaiApiKey || '')
      setAnthropicKey(data.anthropicKey || '')
    } catch (err) {
      const error = err as APIError
      console.error('Error loading settings:', {
        message: error.message
      })
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          openaiApiKey: openaiKey,
          anthropicKey: anthropicKey 
        }),
      })

      const data = await res.json() as ValidationResponse & { saved: boolean }
      
      setValidationErrors({
        openai: openaiKey ? !data.validationResults.openai.valid : false,
        anthropic: anthropicKey ? !data.validationResults.anthropic.valid : false
      })

      if (data.saved) {
        setMessage('Settings saved successfully')
        setTimeout(() => setMessage(''), 3000)
        await loadSettings()
      } else {
        setMessage('Please fix invalid API keys')
        setTimeout(() => setMessage(''), 3000)
      }

    } catch (err) {
      const error = err as APIError
      console.error('Error saving settings:', error)
      setMessage('Error connecting to server')
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
  if (pageLoading) return <LoadingSpinner />

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
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-sm text-slate-400">OpenAI API Key</label>
              {validationErrors.openai && (
                <p className="text-xs text-red-400 font-mono">
                  Invalid API key
                </p>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className={`w-full p-3 bg-slate-800/50 border rounded-xl font-mono text-sm 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                       ${validationErrors.openai ? 'border-red-500/50' : 'border-slate-700'}`}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-sm text-slate-400">Anthropic API Key</label>
              {validationErrors.anthropic && (
                <p className="text-xs text-red-400 font-mono">
                  Invalid API key
                </p>
              )}
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className={`w-full p-3 bg-slate-800/50 border rounded-xl font-mono text-sm 
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                       ${validationErrors.anthropic ? 'border-red-500/50' : 'border-slate-700'}`}
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={loading}
            className="w-full px-4 py-3 bg-emerald-500/80 text-white rounded-xl font-mono 
                     hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] 
                     disabled:opacity-50 disabled:hover:scale-100 shadow-lg mt-8"
          >
            {loading ? 'Validating...' : 'Save Settings'}
          </button>

          {message && (
            <p className={`text-sm font-mono text-center ${
              message.includes('successfully') ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 