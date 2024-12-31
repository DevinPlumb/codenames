import { prisma } from '@/lib/prisma';
import { 
  GameState, 
  ExternalVariables, 
  OperativeAction, 
  SpymasterAction,
  GameContext,
  SpymasterContext,
  OperativeContext,
  Team,
  Role,
  BaseCard,
  SpymasterCard
} from '@/types/game';

interface StateTransition {
  from: GameState;
  to: GameState;
  condition: (vars: ExternalVariables, action?: OperativeAction | SpymasterAction) => boolean;
  action: (vars: ExternalVariables, action?: OperativeAction | SpymasterAction) => Promise<ExternalVariables>;
}

export class GameEngine {
  private game: any; // TODO: Type this properly with Prisma type
  private transitions: StateTransition[];
  private readonly TURN_DURATION_SECONDS = 180; // 3 minutes

  constructor(game: any) {
    this.game = game;
    this.transitions = this.defineTransitions();
  }

  private defineTransitions(): StateTransition[] {
    return [
      // Win conditions (highest precedence)
      {
        from: GameState.RED_OPERATIVE,
        to: GameState.BLUE_WIN,
        condition: (vars) => this.checkAssassinPicked(vars, 'red'),
        action: async (vars) => {
          return this.updateGameCompletion(vars, 'blue', 'assassin');
        }
      },
      {
        from: GameState.BLUE_OPERATIVE,
        to: GameState.RED_WIN,
        condition: (vars) => this.checkAssassinPicked(vars, 'blue'),
        action: async (vars) => {
          return this.updateGameCompletion(vars, 'red', 'assassin');
        }
      },
      {
        from: GameState.RED_OPERATIVE,
        to: GameState.RED_WIN,
        condition: (vars) => vars.board.remainingRed === 0,
        action: async (vars) => {
          return this.updateGameCompletion(vars, 'red', 'words_found');
        }
      },
      {
        from: GameState.BLUE_OPERATIVE,
        to: GameState.BLUE_WIN,
        condition: (vars) => vars.board.remainingBlue === 0,
        action: async (vars) => {
          return this.updateGameCompletion(vars, 'blue', 'words_found');
        }
      },

      // Timer-based transitions
      {
        from: GameState.RED_SPYMASTER,
        to: GameState.BLUE_SPYMASTER,
        condition: (vars) => this.isTimerExpired(vars),
        action: async (vars) => this.resetTurnTimer(vars)
      },
      {
        from: GameState.BLUE_SPYMASTER,
        to: GameState.RED_SPYMASTER,
        condition: (vars) => this.isTimerExpired(vars),
        action: async (vars) => this.resetTurnTimer(vars)
      },
      {
        from: GameState.RED_OPERATIVE,
        to: GameState.BLUE_SPYMASTER,
        condition: (vars) => this.isTimerExpired(vars),
        action: async (vars) => this.resetTurnTimer(vars)
      },
      {
        from: GameState.BLUE_OPERATIVE,
        to: GameState.RED_SPYMASTER,
        condition: (vars) => this.isTimerExpired(vars),
        action: async (vars) => this.resetTurnTimer(vars)
      },

      // Normal gameplay transitions
      {
        from: GameState.RED_SPYMASTER,
        to: GameState.RED_OPERATIVE,
        condition: (_, action) => action?.type === 'clue',
        action: async (vars, action) => ({
          ...vars,
          remainingGuesses: action && 'number' in action ? action.number + 1 : 0
        })
      },
      {
        from: GameState.BLUE_SPYMASTER,
        to: GameState.BLUE_OPERATIVE,
        condition: (_, action) => action?.type === 'clue',
        action: async (vars, action) => ({
          ...vars,
          remainingGuesses: action && 'number' in action ? action.number + 1 : 0
        })
      },
      // Operative transitions based on guesses
      {
        from: GameState.RED_OPERATIVE,
        to: GameState.BLUE_SPYMASTER,
        condition: (vars, action) => 
          action?.type === 'guess' && 
          (this.isWrongColorGuess(vars, action as OperativeAction, 'red') || 
           vars.remainingGuesses === 0),
        action: async (vars) => this.resetTurnTimer(vars)
      },
      {
        from: GameState.BLUE_OPERATIVE,
        to: GameState.RED_SPYMASTER,
        condition: (vars, action) => 
          action?.type === 'guess' && 
          (this.isWrongColorGuess(vars, action as OperativeAction, 'blue') || 
           vars.remainingGuesses === 0),
        action: async (vars) => this.resetTurnTimer(vars)
      },
      // Skip transitions
      {
        from: GameState.RED_OPERATIVE,
        to: GameState.BLUE_SPYMASTER,
        condition: (_, action) => action?.type === 'skip',
        action: async (vars) => this.resetTurnTimer(vars)
      },
      {
        from: GameState.BLUE_OPERATIVE,
        to: GameState.RED_SPYMASTER,
        condition: (_, action) => action?.type === 'skip',
        action: async (vars) => this.resetTurnTimer(vars)
      }
    ];
  }

  public async tick(action?: OperativeAction | SpymasterAction): Promise<void> {
    const vars = this.parseExternalVars(this.game.externalVars);
    
    // Find first matching transition
    const transition = this.transitions.find(t => 
      t.from === this.game.currentState && t.condition(vars, action)
    );

    if (transition) {
      const newVars = await transition.action(vars, action);
      await this.updateGameState(transition.to, newVars);
    }
  }

  private async updateGameState(
    newState: GameState, 
    newVars: ExternalVariables
  ): Promise<void> {
    await prisma.game.update({
      where: { id: this.game.id },
      data: {
        currentState: newState,
        externalVars: JSON.stringify(newVars),
        updatedAt: new Date()
      }
    });
  }

  // Helper methods
  private isTimerExpired(vars: ExternalVariables): boolean {
    const elapsed = (new Date().getTime() - new Date(vars.turnTimer.startedAt).getTime()) / 1000;
    return elapsed >= vars.turnTimer.durationSeconds;
  }

  private resetTurnTimer(vars: ExternalVariables): ExternalVariables {
    return {
      ...vars,
      turnTimer: {
        startedAt: new Date().toISOString(),
        durationSeconds: this.TURN_DURATION_SECONDS
      },
      remainingGuesses: null
    };
  }

  private checkAssassinPicked(vars: ExternalVariables, team: Team): boolean {
    const lastMove = this.game.moves[this.game.moves.length - 1];
    if (!lastMove) return false;
    
    const card = vars.board.cards[lastMove.cardIndex];
    return card.type === 'assassin' && !card.revealed;
  }

  private isWrongColorGuess(
    vars: ExternalVariables, 
    action: OperativeAction,
    team: Team
  ): boolean {
    if (action.type !== 'guess') return false;
    const card = vars.board.cards[action.cardIndex];
    if (!card || card.revealed) return false;
    return card.type !== team;
  }

  private async updateGameCompletion(
    vars: ExternalVariables,
    winner: Team,
    reason: string
  ): Promise<ExternalVariables> {
    await prisma.game.update({
      where: { id: this.game.id },
      data: {
        completedAt: new Date(),
        winner,
        endReason: reason
      }
    });
    return vars;
  }

  // LLM-friendly context generator
  public getGameContext(role: Role): GameContext {
    const vars = this.parseExternalVars(this.game.externalVars);
    const baseContext = {
      currentState: this.game.currentState as GameState,
      currentTeam: this.getCurrentTeam(),
      remainingRed: vars.board.remainingRed,
      remainingBlue: vars.board.remainingBlue,
      currentClue: this.game.currentClue ? {
        word: this.game.currentClue,
        number: this.game.currentNumber
      } : undefined
    };

    if (role === 'spymaster') {
      return {
        ...baseContext,
        cards: vars.board.cards as SpymasterCard[]
      };
    } else {
      const cards = vars.board.cards.map(card => ({
        ...card,
        type: card.revealed ? card.type : undefined
      })) as BaseCard[];

      return {
        ...baseContext,
        cards,
        remainingGuesses: vars.remainingGuesses,
        previousGuesses: this.getRecentGuesses(),
        availableMoves: cards
          .filter(c => !c.revealed)
          .map(c => c.index)
      };
    }
  }

  private getCurrentTeam(): Team {
    return this.game.currentState.startsWith('RED') ? 'red' : 'blue';
  }

  private getRecentGuesses() {
    return this.game.moves
      .filter((m: any) => m.teamTurn === this.getCurrentTeam())
      .map((m: any) => ({
        cardIndex: m.cardIndex,
        word: this.game.externalVars.board.cards[m.cardIndex].word,
        success: m.cardType === this.getCurrentTeam()
      }));
  }

  private parseExternalVars(varsJson: string): ExternalVariables {
    return JSON.parse(varsJson);
  }
} 