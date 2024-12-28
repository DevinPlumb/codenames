import { useState } from 'react'

interface ClueInputProps {
  onSubmitClue: (word: string, number: number) => void
  disabled?: boolean
}

export default function ClueInput({ onSubmitClue, disabled }: ClueInputProps) {
  const [word, setWord] = useState('')
  const [number, setNumber] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (word && number) {
      onSubmitClue(word.toUpperCase(), parseInt(number))
      setWord('')
      setNumber('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
      <div>
        <label className="block text-sm font-mono text-slate-400 mb-1">Clue Word</label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          disabled={disabled}
          className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 font-mono text-sm
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          placeholder="Enter one word..."
        />
      </div>
      <div>
        <label className="block text-sm font-mono text-slate-400 mb-1">Number</label>
        <input
          type="number"
          min="0"
          max="9"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          disabled={disabled}
          className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 font-mono text-sm w-20
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !word || !number}
        className="px-4 py-2 bg-emerald-500/80 text-white rounded-xl font-mono border border-emerald-700/50 
                 hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02] shadow-lg
                 disabled:opacity-50 disabled:hover:scale-100"
      >
        Give Clue
      </button>
    </form>
  )
} 