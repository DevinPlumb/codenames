export interface SpymasterHint {
  word: string
  number: number
  reasoning?: string  // For debugging/logging
}

export interface OperativeGuess {
  cardIndex: number
  confidence: number
  reasoning?: string  // For debugging/logging
}

export interface GameContext {
  cards: Array<{
    word: string
    type: 'red' | 'blue' | 'neutral' | 'assassin'
    revealed: boolean
  }>
  currentTeam: 'red' | 'blue'
  remainingRed: number
  remainingBlue: number
  unrevealedCards: Array<{
    word: string
    index: number
  }>
  currentClue?: {
    word: string
    number: number
  }
  guessesThisTurn: number
  previousGuesses?: Array<{
    word: string
    type: string
    success: boolean
  }>
} 