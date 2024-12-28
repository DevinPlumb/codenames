import { useSession } from '@supabase/auth-helpers-react'

export default function AuthDebug() {
  const session = useSession()

  if (!session) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl text-sm font-mono shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          <p className="text-slate-400">Status: <span className="text-red-400">disconnected</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl text-sm font-mono shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
        <p className="text-slate-400">Status: <span className="text-emerald-400">connected</span></p>
      </div>
      {session.user.email && (
        <p className="mt-2 text-xs text-slate-500">{session.user.email}</p>
      )}
    </div>
  )
} 