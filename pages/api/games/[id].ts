import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

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
            moves: true
          }
        })
        return res.status(200).json(game)
      } catch (error) {
        return res.status(500).json({ error: 'Error fetching game' })
      }
    }

    if (req.method === 'PATCH') {
      try {
        const { gameState, move, winner, endReason, currentTeam, currentClue, currentNumber, clueGiver } = req.body
        
        const updatedGame = await prisma.game.update({
          where: { id: String(id) },
          data: {
            gameState: gameState ? {
              cards: gameState.cards.map((card: any) => ({
                word: card.word,
                type: card.type,
                revealed: card.revealed
              }))
            } : undefined,
            currentTeam,
            winner,
            endReason,
            currentClue,
            currentNumber,
            clueGiver,
            completedAt: winner ? new Date() : undefined,
            turnStartedAt: currentTeam ? new Date() : undefined,
            moves: move ? {
              create: {
                playerId: session.user.id,
                ...move
              }
            } : undefined
          },
          include: {
            players: true,
            moves: true
          }
        })
        return res.status(200).json(updatedGame)
      } catch (error) {
        return res.status(500).json({ error: 'Error updating game' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Authentication error' })
  }
}