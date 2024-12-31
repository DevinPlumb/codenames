export enum GameState {
  RED_SPYMASTER = 'RED_SPYMASTER',
  RED_OPERATIVE = 'RED_OPERATIVE',
  BLUE_SPYMASTER = 'BLUE_SPYMASTER',
  BLUE_OPERATIVE = 'BLUE_OPERATIVE',
  RED_WIN = 'RED_WIN',
  BLUE_WIN = 'BLUE_WIN'
}

export type CardType = 'red' | 'blue' | 'neutral' | 'assassin';
export type Team = 'red' | 'blue';
export type Role = 'spymaster' | 'operative';

// Base card info visible to all players
export interface BaseCard {
  word: string;
  revealed: boolean;
  index: number;
  type?: CardType; // Only visible if revealed or to spymaster
}

// Full card info (only for spymaster)
export interface SpymasterCard extends BaseCard {
  type: CardType; // Always visible to spymaster
}

export interface GameBoard {
  cards: BaseCard[] | SpymasterCard[]; // Type depends on viewer's role
  remainingRed: number;
  remainingBlue: number;
}

export interface ExternalVariables {
  board: GameBoard;
  remainingGuesses: number | null;  // null when not in operative state
  turnTimer: {
    startedAt: Date;
    durationSeconds: number;
  };
}

// LLM-friendly interfaces for moves
export type OperativeAction = {
  type: 'guess';
  cardIndex: number; // Must be index of an unrevealed card
} | {
  type: 'skip';
};

export type SpymasterAction = {
  type: 'clue';
  word: string;
  number: number;
};

// Base context shared between roles
interface BaseGameContext {
  currentState: GameState;
  currentTeam: Team;
  remainingRed: number;
  remainingBlue: number;
  currentClue?: {
    word: string;
    number: number;
  };
}

// Spymaster sees all card colors
export interface SpymasterContext extends BaseGameContext {
  cards: SpymasterCard[];
}

// Operative only sees revealed colors and available moves
export interface OperativeContext extends BaseGameContext {
  cards: BaseCard[];
  remainingGuesses: number | null;
  previousGuesses?: {
    cardIndex: number;
    word: string;
    success: boolean;
  }[];
  availableMoves: number[]; // Indices of unrevealed cards
}

// Union type for all possible contexts
export type GameContext = SpymasterContext | OperativeContext; 

// Types needed for the UI
export interface Player {
  id: string;
  userId: string;
  gameId: string;
  team: Team;
  role: Role;
}

export interface GameSummary {
  id: string;
  createdAt: string;
  completedAt: string | null;
  currentState: GameState;
  winner: Team | null;
  players: Player[];
} 