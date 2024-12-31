import { prisma } from '@/lib/prisma';
import { GameEngine } from './game-engine';
import { 
  OperativeAction, 
  SpymasterAction, 
  GameContext,
  SpymasterContext,
  OperativeContext,
  GameState,
  Team,
  Role
} from '@/types/game';

export class GameService {
  private engine: GameEngine | null = null;
  private gameId: string;
  
  constructor(gameId: string) {
    this.gameId = gameId;
  }

  private async initEngine(): Promise<void> {
    if (!this.engine) {
      const game = await prisma.game.findUnique({
        where: { id: this.gameId },
        include: { moves: true }
      });
      if (!game) throw new Error('Game not found');
      this.engine = new GameEngine(game);
    }
  }

  // LLM-friendly methods
  public async getGameContext(playerId: string): Promise<GameContext> {
    await this.initEngine();
    const player = await this.getPlayer(playerId);
    return this.engine!.getGameContext(player.role as Role);
  }

  public async makeOperativeMove(
    playerId: string, 
    action: OperativeAction
  ): Promise<boolean> {
    await this.initEngine();
    const player = await this.getPlayer(playerId);
    const context = await this.getGameContext(playerId) as OperativeContext;
    
    // Validate player's turn
    if (!this.isPlayersTurn(context, {
      team: player.team as Team,
      role: player.role as Role
    })) {
      throw new Error('Not your turn');
    }

    if (action.type === 'guess') {
      // Validate card index is available
      if (!context.availableMoves.includes(action.cardIndex)) {
        throw new Error('Invalid move: Card index not available');
      }
    }

    // Process the move
    await this.engine!.tick(action);
    
    // Record the move if it was a guess
    if (action.type === 'guess') {
      await this.recordMove(playerId, action);
    }

    return true;
  }

  public async makeSpymasterMove(
    playerId: string,
    action: SpymasterAction
  ): Promise<boolean> {
    await this.initEngine();
    const player = await this.getPlayer(playerId);
    const context = await this.getGameContext(playerId) as SpymasterContext;
    
    // Validate player's turn
    if (!this.isPlayersTurn(context, {
      team: player.team as Team,
      role: player.role as Role
    })) {
      throw new Error('Not your turn');
    }

    // Validate clue word isn't on board
    const clueWord = action.word.toLowerCase();
    const boardWords = context.cards.map(c => 
      c.word.toLowerCase()
    );
    if (boardWords.includes(clueWord)) {
      throw new Error('Clue word cannot be on the board');
    }

    // Process the clue
    await this.engine!.tick(action);
    
    // Record the clue
    await prisma.hint.create({
      data: {
        gameId: this.gameId,
        team: player.team,
        word: action.word,
        number: action.number
      }
    });

    return true;
  }

  // Helper methods
  private async getPlayer(playerId: string) {
    const player = await prisma.gamePlayer.findFirst({
      where: { 
        gameId: this.gameId,
        userId: playerId
      }
    });
    if (!player) throw new Error('Player not found');
    return player;
  }

  private isPlayersTurn(
    context: GameContext, 
    player: { team: Team, role: Role }
  ): boolean {
    const currentTeam = context.currentTeam;
    const currentRole = this.getCurrentRole(context.currentState);
    return player.team === currentTeam && player.role === currentRole;
  }

  private getCurrentRole(state: GameState): Role {
    return state.includes('SPYMASTER') ? 'spymaster' : 'operative';
  }

  private async recordMove(
    playerId: string, 
    action: OperativeAction & { type: 'guess' }
  ) {
    const context = await this.getGameContext(playerId) as OperativeContext;
    const card = context.cards[action.cardIndex];
    if (!card) return; // Should never happen due to earlier validation

    await prisma.move.create({
      data: {
        gameId: this.gameId,
        playerId,
        cardIndex: action.cardIndex,
        cardType: card.type || 'unknown', // Type might be hidden from operative
        teamTurn: context.currentTeam
      }
    });
  }

  // Game loop management
  public async startGameLoop(): Promise<void> {
    await this.initEngine();
    
    // Check for timer-based transitions every 5 seconds
    setInterval(async () => {
      await this.engine!.tick();
    }, 5000);
  }
} 