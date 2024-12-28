import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import { initializeGameBoard } from '../../../utils/game'

interface PrismaError {
  code?: string;
  meta?: unknown;
  message: string;
  stack?: string;
  name?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res })
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'POST') {
      try {
        // Initialize game state
        const gameState = initializeGameBoard()
        if (!gameState.cards || gameState.cards.length !== 25) {
          throw new Error('Invalid game state')
        }

        // Create game with player
        const game = await prisma.game.create({
          data: {
            currentTeam: 'red',
            turnStartedAt: new Date().toISOString(),
            gameState: {
              cards: gameState.cards.map(card => ({
                word: card.word,
                type: card.type,
                revealed: card.revealed
              }))
            },
            players: {
              create: [{
                userId: session.user.id,
                team: req.body.team,
                role: req.body.role
              }]
            }
          },
          include: {
            players: true,
            moves: true
          }
        })

        return res.status(200).json(game)
      } catch (err) {
        const error = err as PrismaError
        console.error('Error creating game:', {
          error: error.message,
          code: error.code,
          body: req.body,
          userId: session?.user?.id,
          stack: error.stack
        })
        return res.status(500).json({ 
          error: 'Error creating game', 
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  } catch (err) {
    const error = err as PrismaError
    console.error('Auth error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    })
  }
} 