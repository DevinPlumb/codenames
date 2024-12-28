export interface Player {
  userId: string
  team: 'red' | 'blue'
  role: 'spymaster' | 'operative'
}

export interface GameSummary {
  id: string
  createdAt: string
  completedAt: string | null
  winner: string | null
  players: Player[]
} 