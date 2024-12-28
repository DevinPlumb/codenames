import { useEffect, useState } from 'react'

interface TurnTimerProps {
  duration: number  // Duration in seconds
  onTimeUp: () => void
  turnStartedAt: string  // ISO date string
}

export default function TurnTimer({ duration, onTimeUp, turnStartedAt }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    // Calculate initial time left based on turnStartedAt
    const turnStart = new Date(turnStartedAt).getTime()
    const now = new Date().getTime()
    const elapsed = Math.floor((now - turnStart) / 1000)
    const remaining = Math.max(0, duration - elapsed)
    
    setTimeLeft(remaining)

    // Start countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [turnStartedAt, duration, onTimeUp])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className={`font-mono text-lg ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
} 