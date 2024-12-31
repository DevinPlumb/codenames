import { useState, useEffect, useMemo } from 'react'
import type { ModelOption } from '@/utils/models'

interface NewGameModalProps {
  onClose: () => void
  onCreateGame: (
    team: 'red' | 'blue', 
    role: 'spymaster' | 'operative',
    aiModels: {
      redSpymaster?: string    // Only needed if human isn't red spymaster
      blueSpymaster?: string   // Only needed if human isn't blue spymaster
      redOperative?: string    // Only needed if human isn't red operative
      blueOperative?: string   // Only needed if human isn't blue operative
    }
  ) => void
}

export default function NewGameModal({ onClose, onCreateGame }: NewGameModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<'red' | 'blue' | null>(null)
  const [selectedRole, setSelectedRole] = useState<'spymaster' | 'operative' | null>(null)
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModels, setSelectedModels] = useState({
    redSpymaster: '',
    blueSpymaster: '',
    redOperative: '',
    blueOperative: ''
  })

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      setModels(data)
      // Set default models
      if (data.length > 0) {
        setSelectedModels({
          redSpymaster: data[0].id,
          blueSpymaster: data[0].id,
          redOperative: data[0].id,
          blueOperative: data[0].id
        })
      }
    } catch (error) {
      // Silently handle model loading errors
    }
  }

  const handleCreate = () => {
    if (selectedTeam && selectedRole && models.length > 0) {
      // Only include models for AI roles
      const aiModels: Record<string, string> = {}
      
      // If human is red spymaster, AI plays blue spymaster and both operatives
      if (selectedTeam === 'red' && selectedRole === 'spymaster') {
        aiModels.blueSpymaster = selectedModels.blueSpymaster
        aiModels.redOperative = selectedModels.redOperative
        aiModels.blueOperative = selectedModels.blueOperative
      }
      // If human is blue spymaster, AI plays red spymaster and both operatives
      else if (selectedTeam === 'blue' && selectedRole === 'spymaster') {
        aiModels.redSpymaster = selectedModels.redSpymaster
        aiModels.redOperative = selectedModels.redOperative
        aiModels.blueOperative = selectedModels.blueOperative
      }
      // If human is red operative, AI plays both spymasters and blue operative
      else if (selectedTeam === 'red' && selectedRole === 'operative') {
        aiModels.redSpymaster = selectedModels.redSpymaster
        aiModels.blueSpymaster = selectedModels.blueSpymaster
        aiModels.blueOperative = selectedModels.blueOperative
      }
      // If human is blue operative, AI plays both spymasters and red operative
      else if (selectedTeam === 'blue' && selectedRole === 'operative') {
        aiModels.redSpymaster = selectedModels.redSpymaster
        aiModels.blueSpymaster = selectedModels.blueSpymaster
        aiModels.redOperative = selectedModels.redOperative
      }

      onCreateGame(selectedTeam, selectedRole, aiModels)
    }
  }

  // Memoize the AI roles based on team and role selection
  const aiRoles = useMemo(() => {
    if (!selectedTeam || !selectedRole) return null;

    if (selectedTeam === 'red') {
      if (selectedRole === 'spymaster') {
        return {
          teammate: { label: 'Red Operative', field: 'redOperative' },
          opponent1: { label: 'Blue Spymaster', field: 'blueSpymaster' },
          opponent2: { label: 'Blue Operative', field: 'blueOperative' }
        }
      } else {
        return {
          teammate: { label: 'Red Spymaster', field: 'redSpymaster' },
          opponent1: { label: 'Blue Spymaster', field: 'blueSpymaster' },
          opponent2: { label: 'Blue Operative', field: 'blueOperative' }
        }
      }
    } else {
      if (selectedRole === 'spymaster') {
        return {
          teammate: { label: 'Blue Operative', field: 'blueOperative' },
          opponent1: { label: 'Red Spymaster', field: 'redSpymaster' },
          opponent2: { label: 'Red Operative', field: 'redOperative' }
        }
      } else {
        return {
          teammate: { label: 'Blue Spymaster', field: 'blueSpymaster' },
          opponent1: { label: 'Red Spymaster', field: 'redSpymaster' },
          opponent2: { label: 'Red Operative', field: 'redOperative' }
        }
      }
    }
  }, [selectedTeam, selectedRole])

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

        <div className="mb-6">
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

        {/* Model selection */}
        {selectedTeam && selectedRole && (
          <div className="mb-8">
            <h3 className="text-slate-400 font-mono mb-3">Choose AI Models</h3>
            <div className="space-y-4">
              {/* Teammate AI */}
              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">
                  {aiRoles?.teammate.label}
                </label>
                <select
                  value={selectedModels[aiRoles?.teammate.field as keyof typeof selectedModels]}
                  onChange={(e) => {
                    const field = aiRoles?.teammate.field
                    if (field) {
                      setSelectedModels({
                        ...selectedModels,
                        [field]: e.target.value
                      })
                    }
                  }}
                  className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-xl 
                           font-mono text-sm text-slate-300"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opponent AI 1 */}
              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">
                  {aiRoles?.opponent1.label}
                </label>
                <select
                  value={selectedModels[aiRoles?.opponent1.field as keyof typeof selectedModels]}
                  onChange={(e) => {
                    const field = aiRoles?.opponent1.field
                    if (field) {
                      setSelectedModels({
                        ...selectedModels,
                        [field]: e.target.value
                      })
                    }
                  }}
                  className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-xl 
                           font-mono text-sm text-slate-300"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opponent AI 2 */}
              <div>
                <label className="block text-sm font-mono text-slate-400 mb-2">
                  {aiRoles?.opponent2.label}
                </label>
                <select
                  value={selectedModels[aiRoles?.opponent2.field as keyof typeof selectedModels]}
                  onChange={(e) => {
                    const field = aiRoles?.opponent2.field
                    if (field) {
                      setSelectedModels({
                        ...selectedModels,
                        [field]: e.target.value
                      })
                    }
                  }}
                  className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-xl 
                           font-mono text-sm text-slate-300"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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