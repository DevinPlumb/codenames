import { useState } from 'react'

interface NewGameModalProps {
  onClose: () => void
  onCreateGame: (team: 'red' | 'blue', role: 'spymaster' | 'operative') => void
}

export default function NewGameModal({ onClose, onCreateGame }: NewGameModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<'red' | 'blue' | null>(null)
  const [selectedRole, setSelectedRole] = useState<'spymaster' | 'operative' | null>(null)

  const handleCreate = () => {
    if (selectedTeam && selectedRole) {
      onCreateGame(selectedTeam, selectedRole)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-xl text-center shadow-lg max-w-md mx-4">
        <h2 className="text-2xl font-mono font-bold mb-6 text-slate-200">New Game</h2>
        
        <div className="mb-6">
          <h3 className="text-slate-400 font-mono mb-3">Choose Team</h3>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setSelectedTeam('red')}
              className={`px-6 py-3 font-mono border rounded-xl transition-all duration-200 ${
                selectedTeam === 'red'
                  ? 'bg-red-500/80 text-white border-red-700/50'
                  : 'bg-slate-800/80 text-red-400 border-slate-700 hover:bg-slate-700/80'
              }`}
            >
              Red Team
            </button>
            <button
              onClick={() => setSelectedTeam('blue')}
              className={`px-6 py-3 font-mono border rounded-xl transition-all duration-200 ${
                selectedTeam === 'blue'
                  ? 'bg-blue-500/80 text-white border-blue-700/50'
                  : 'bg-slate-800/80 text-blue-400 border-slate-700 hover:bg-slate-700/80'
              }`}
            >
              Blue Team
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-slate-400 font-mono mb-3">Choose Role</h3>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setSelectedRole('spymaster')}
              className={`px-6 py-3 font-mono border rounded-xl transition-all duration-200 ${
                selectedRole === 'spymaster'
                  ? 'bg-slate-700/80 text-white border-slate-600/50'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
              }`}
            >
              Spymaster
            </button>
            <button
              onClick={() => setSelectedRole('operative')}
              className={`px-6 py-3 font-mono border rounded-xl transition-all duration-200 ${
                selectedRole === 'operative'
                  ? 'bg-slate-700/80 text-white border-slate-600/50'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
              }`}
            >
              Field Operative
            </button>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                     hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedTeam || !selectedRole}
            className="px-6 py-3 bg-emerald-500/80 text-white rounded-xl font-mono border border-emerald-700/50 
                     hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] shadow-lg
                     disabled:opacity-50 disabled:hover:scale-100"
          >
            Create Game
          </button>
        </div>
      </div>
    </div>
  )
} 