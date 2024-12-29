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

export interface Card {
  word: string
  type: 'red' | 'blue' | 'neutral' | 'assassin'
  revealed: boolean
}

export interface Move {
  id: string
  teamTurn: string
  cardIndex: number
  cardType: string
  createdAt: Date
  playerId: string
  gameId: string
}

export interface UnrevealedCard {
  word: string
  index: number
}

export interface PreviousGuess {
  word: string
  type: string
  success: boolean
}

// Use these types in GameContext
export interface GameContext {
  cards: Card[]
  currentTeam: 'red' | 'blue'
  remainingRed: number
  remainingBlue: number
  unrevealedCards: UnrevealedCard[]
  currentClue?: {
    word: string
    number: number
  }
  guessesThisTurn: number
  previousGuesses?: PreviousGuess[]
} 