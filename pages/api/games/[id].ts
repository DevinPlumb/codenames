import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import { GameState, Team, Role, SpymasterContext, OperativeContext, ExternalVariables } from '@/types/game'
import { getSpymasterHint, getOperativeGuess } from '@/utils/ai-players'

interface Move {
  teamTurn: Team;
  cardIndex: number;
  cardType: string;
  createdAt: string;
  playerId: string;
}

interface GameData {
  id: string;
  currentState: string;
  externalVars: string;
  winner: Team | null;
  endReason: string | null;
  currentClue: string | null;
  currentNumber: number | null;
  redSpymasterModel: string | null;
  blueSpymasterModel: string | null;
  redOperativeModel: string | null;
  blueOperativeModel: string | null;
  moves: Move[];
  players: Array<{
    userId: string;
    team: Team;
    role: Role;
  }>;
}

interface PrismaGame {
  id: string;
  currentState: string;
  externalVars: any;
  winner: string | null;
  endReason: string | null;
  currentClue: string | null;
  currentNumber: number | null;
  redSpymasterModel: string | null;
  blueSpymasterModel: string | null;
  redOperativeModel: string | null;
  blueOperativeModel: string | null;
  moves: Array<{
    id: string;
    createdAt: Date;
    playerId: string;
    cardIndex: number;
    cardType: string;
    teamTurn: string;
    gameId: string;
  }>;
  players: Array<{
    id: string;
    team: string;
    userId: string;
    gameId: string;
    role: string;
  }>;
  hints: Array<{
    id: string;
    team: string;
    word: string;
    number: number;
    timestamp: Date;
    gameId: string;
  }>;
}

// Helper to parse external vars safely
function parseExternalVars(varsJson: string | null): ExternalVariables | null {
  if (!varsJson) return null;
  try {
    return JSON.parse(varsJson);
  } catch (e) {
    console.error('Failed to parse external vars:', e);
    return null;
  }
}

// Helper to get current team from game state string
function getTeamFromState(stateStr: string): Team {
  const state = stateStr as GameState;
  if (state === GameState.RED_SPYMASTER || state === GameState.RED_OPERATIVE || state === GameState.RED_WIN) {
    return 'red';
  }
  return 'blue';
}

// Helper to create game context for AI players
function createGameContext(game: GameData, parsedVars: ExternalVariables): SpymasterContext | OperativeContext {
  const currentTeam = getTeamFromState(game.currentState);
  const isOperative = game.currentState === GameState.RED_OPERATIVE || game.currentState === GameState.BLUE_OPERATIVE;

  const baseContext = {
    currentState: game.currentState as GameState,
    currentTeam,
    remainingRed: parsedVars.board.remainingRed,
    remainingBlue: parsedVars.board.remainingBlue,
    currentClue: game.currentClue ? {
      word: game.currentClue,
      number: game.currentNumber!
    } : undefined
  };

  if (isOperative) {
    return {
      ...baseContext,
      cards: parsedVars.board.cards,
      remainingGuesses: parsedVars.remainingGuesses,
      availableMoves: parsedVars.board.cards
        .map((card, index) => ({ index, revealed: card.revealed }))
        .filter(card => !card.revealed)
        .map(card => card.index),
      previousGuesses: game.moves
        .filter(m => m.teamTurn === currentTeam)
        .map(m => ({
          cardIndex: m.cardIndex,
          word: parsedVars.board.cards[m.cardIndex].word,
          success: m.cardType === currentTeam
        }))
    };
  }

  return {
    ...baseContext,
    cards: parsedVars.board.cards.map(card => ({
      ...card,
      type: card.type!
    }))
  };
}

// Helper to convert Prisma game to GameData
function convertPrismaGame(game: PrismaGame): GameData {
  return {
    id: game.id,
    currentState: game.currentState,
    externalVars: typeof game.externalVars === 'string' 
      ? game.externalVars 
      : JSON.stringify(game.externalVars),
    winner: game.winner as Team | null,
    endReason: game.endReason,
    currentClue: game.currentClue,
    currentNumber: game.currentNumber,
    redSpymasterModel: game.redSpymasterModel,
    blueSpymasterModel: game.blueSpymasterModel,
    redOperativeModel: game.redOperativeModel,
    blueOperativeModel: game.blueOperativeModel,
    moves: game.moves.map(m => ({
      teamTurn: m.teamTurn as Team,
      cardIndex: m.cardIndex,
      cardType: m.cardType,
      createdAt: m.createdAt.toISOString(),
      playerId: m.playerId
    })),
    players: game.players.map(p => ({
      userId: p.userId,
      team: p.team as Team,
      role: p.role as Role
    }))
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res })
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
      // Get specific game
      try {
        const game = await prisma.game.findUnique({
          where: { id: String(id) },
          include: {
            players: true,
            moves: true,
            hints: true
          }
        })
        return res.status(200).json(game)
      } catch (error) {
        return res.status(500).json({ error: 'Error fetching game' })
      }
    }

    if (req.method === 'PATCH') {
      try {
        const prismaGame = await prisma.game.findUnique({
          where: { id: req.query.id as string },
          include: {
            players: true,
            moves: true,
            hints: true
          }
        });

        if (!prismaGame) {
          return res.status(404).json({ error: 'Game not found' });
        }

        const game = convertPrismaGame(prismaGame);
        const parsedVars = parseExternalVars(game.externalVars);
        if (!parsedVars) {
          return res.status(500).json({ error: 'Failed to parse game state' });
        }

        const currentTeam = getTeamFromState(game.currentState);
        const currentRole = game.currentClue ? 'operative' : 'spymaster';

        // Handle AI moves
        const currentPlayer = game.players.find(p => 
          p.team === currentTeam && p.role === currentRole
        );

        if (!currentPlayer?.userId) {
          // It's an AI's turn
          const user = await prisma.user.findUnique({
            where: { id: session.user.id }
          });

          if (!user?.openaiApiKey && !user?.anthropicKey) {
            return res.status(400).json({ error: 'API key required for AI moves' });
          }

          const gameContext = createGameContext(game, parsedVars);
          const apiKey = user.openaiApiKey || user.anthropicKey!;
          const modelId = currentRole === 'spymaster'
            ? (currentTeam === 'red' ? game.redSpymasterModel : game.blueSpymasterModel)
            : (currentTeam === 'red' ? game.redOperativeModel : game.blueOperativeModel);

          if (!modelId) {
            return res.status(400).json({ error: 'No AI model configured for this role' });
          }

          try {
            if (currentRole === 'spymaster') {
              const hint = await getSpymasterHint(modelId, gameContext as SpymasterContext, apiKey);
              // Update game with AI's hint
              const updatedGame = await prisma.game.update({
                where: { id: game.id },
                data: {
                  currentState: currentTeam === 'red' ? GameState.RED_OPERATIVE : GameState.BLUE_OPERATIVE,
                  currentClue: hint.word,
                  currentNumber: hint.number,
                  hints: {
                    create: {
                      team: currentTeam,
                      word: hint.word,
                      number: hint.number
                    }
                  }
                },
                include: {
                  players: true,
                  moves: true,
                  hints: true
                }
              });
              return res.status(200).json(updatedGame);
            } else {
              const guess = await getOperativeGuess(modelId, gameContext as OperativeContext, apiKey);
              // Update game with AI's guess
              const updatedGame = await prisma.game.update({
                where: { id: game.id },
                data: {
                  moves: {
                    create: {
                      playerId: `AI-${currentTeam}-${currentRole}`,
                      cardIndex: guess.cardIndex,
                      cardType: parsedVars.board.cards[guess.cardIndex].type!,
                      teamTurn: currentTeam
                    }
                  }
                },
                include: {
                  players: true,
                  moves: true,
                  hints: true
                }
              });
              return res.status(200).json(updatedGame);
            }
          } catch (error) {
            console.error('AI move error:', error);
            return res.status(500).json({ error: 'Failed to generate AI move' });
          }
        }

        // Handle human moves
        // ... rest of the handler ...
      } catch (error) {
        console.error('Game update error:', error);
        return res.status(500).json({ error: 'Failed to update game' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Authentication error' })
  }
}