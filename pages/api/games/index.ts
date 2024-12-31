import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Card, initializeGameBoard } from '@/utils/game'
import { Team, Role, GameState } from '@/types/game'

interface PrismaError {
  code?: string;
  meta?: unknown;
  message: string;
  stack?: string;
  name?: string;
}

interface CreateGameBody {
  team: Team;
  role: Role;
  aiModels: {
    redSpymaster?: string;
    blueSpymaster?: string;
    redOperative?: string;
    blueOperative?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res })
    
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('Auth error:', authError)
      return res.status(401).json({ 
        error: 'Authentication error',
        details: process.env.NODE_ENV === 'development' ? authError : undefined
      })
    }

    if (!session?.user?.id) {
      console.error('No session found')
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No valid session found'
      })
    }

    if (req.method === 'POST') {
      const { team, role, aiModels } = req.body as CreateGameBody;

      // Validate required fields
      if (!team || !role) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          message: 'Team and role are required'
        })
      }

      // Validate team and role values
      if (!['red', 'blue'].includes(team) || !['spymaster', 'operative'].includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid team or role',
          message: 'Team must be "red" or "blue", role must be "spymaster" or "operative"'
        })
      }

      try {
        // Initialize game state
        const gameState = initializeGameBoard();
        if (!gameState.cards || gameState.cards.length !== 25) {
          throw new Error('Failed to initialize game board');
        }

        // Create initial external variables
        const externalVars = {
          board: {
            cards: gameState.cards,
            remainingRed: gameState.cards.filter(c => c.type === 'red').length,
            remainingBlue: gameState.cards.filter(c => c.type === 'blue').length
          },
          remainingGuesses: null,
          turnTimer: {
            startedAt: new Date().toISOString(),
            durationSeconds: 180
          }
        };

        // Create game with player and AI model assignments
        const game = await prisma.game.create({
          data: {
            currentState: GameState.RED_SPYMASTER,
            externalVars: JSON.stringify(externalVars),
            redSpymasterModel: aiModels.redSpymaster || null,
            blueSpymasterModel: aiModels.blueSpymaster || null,
            redOperativeModel: aiModels.redOperative || null,
            blueOperativeModel: aiModels.blueOperative || null,
            players: {
              create: [{
                userId: session.user.id,
                team,
                role
              }]
            }
          },
          include: {
            players: true,
            moves: true
          }
        });

        return res.status(200).json(game);
      } catch (error) {
        console.error('Error creating game:', error)
        return res.status(500).json({ 
          error: 'Error creating game',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        })
      }
    }

    if (req.method === 'GET') {
      try {
        const games = await prisma.game.findMany({
          where: {
            players: {
              some: {
                userId: session.user.id
              }
            }
          },
          include: {
            players: true,
            moves: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
        return res.status(200).json(games)
      } catch (err) {
        const error = err as PrismaError
        console.error('Error fetching games:', error.message)
        return res.status(500).json({ error: 'Error fetching games' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
} 