import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameContext } from '@/types/ai'
import { getSpymasterHint, getOperativeGuess } from '@/utils/ai-players'

interface GameCard {
  word: string
  type: 'red' | 'blue' | 'neutral' | 'assassin'
  revealed: boolean
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
      const { id } = req.query
      let { currentTeam, gameState, currentClue, currentNumber, hint } = req.body

      try {
        const game = await prisma.game.findUnique({
          where: { id: id as string },
          include: { players: true, moves: true, hints: true }
        })

        if (!game) {
          return res.status(404).json({ error: 'Game not found' })
        }

        // Determine current role based on whether there's a clue
        let currentRole = game.currentClue ? 'operative' : 'spymaster'

        // Initialize turn management variables
        let nextTeam = currentTeam
        let shouldClearClue = false

        // Create context for AI moves and turn management
        const context: GameContext = {
          cards: gameState.cards,
          currentTeam,
          remainingRed: gameState.cards.filter((c: GameCard) => c.type === 'red' && !c.revealed).length,
          remainingBlue: gameState.cards.filter((c: GameCard) => c.type === 'blue' && !c.revealed).length,
          unrevealedCards: gameState.cards
            .map((card: GameCard, index: number) => ({ 
              word: card.word, 
              index 
            }))
            .filter((card: { word: string, index: number }) => !gameState.cards[card.index].revealed),
          currentClue: game.currentClue ? {
            word: game.currentClue,
            number: game.currentNumber!
          } : undefined,
          guessesThisTurn: game.moves.filter((m) => 
            m.teamTurn === currentTeam && 
            m.createdAt > game.turnStartedAt!
          ).length,
          previousGuesses: game.moves
            .filter((m) => m.teamTurn === currentTeam)
            .map((m) => ({
              word: gameState.cards[m.cardIndex].word,
              type: m.cardType,
              success: m.cardType === currentTeam
            }))
        }

        // Find the current player
        const currentPlayer = game.players.find(p => 
          p.team === currentTeam && p.role === currentRole
        )

        // First check for game end conditions
        const assassinRevealed = gameState.cards.some((c: GameCard) => c.type === 'assassin' && c.revealed)
        let winner: 'red' | 'blue' | null = null
        let endReason: string | null = null

        if (assassinRevealed) {
          winner = currentTeam === 'red' ? 'blue' : 'red'
          endReason = 'assassin'
        } else if (context.remainingRed === 0) {
          winner = 'red'
          endReason = 'all_words_found'
        } else if (context.remainingBlue === 0) {
          winner = 'blue'
          endReason = 'all_words_found'
        }

        // If it's an AI's turn, handle AI move
        if (!currentPlayer?.userId) {
          // Check if game is already over
          if (winner) {
            return res.status(200).json(game)  // Don't make moves if game is over
          }

          const modelId = currentTeam === 'red' 
            ? (currentRole === 'spymaster' ? game.redSpymasterModel : game.redOperativeModel)
            : (currentRole === 'spymaster' ? game.blueSpymasterModel : game.blueOperativeModel)

          if (!modelId) {
            return res.status(500).json({ error: 'No AI model assigned for this role' })
          }

          // Get API key for the model
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { openaiApiKey: { not: null } },
                { anthropicKey: { not: null } }
              ]
            }
          })

          const apiKey = modelId.includes('claude') ? user?.anthropicKey : user?.openaiApiKey
          if (!apiKey) {
            return res.status(500).json({ error: 'No API key available' })
          }

          if (currentRole === 'spymaster') {
            // Prevent giving a hint if there's already one active
            if (game.currentClue) {
              console.error('Attempted to give hint while one is active')
              return res.status(400).json({ error: 'Cannot give hint while one is active' })
            }

            const hint = await getSpymasterHint(modelId, context, apiKey)
            
            // Validate that hint word isn't on the board
            const isWordOnBoard = gameState.cards.some((card: GameCard) => 
              card.word.toLowerCase().includes(hint.word.toLowerCase()) || 
              hint.word.toLowerCase().includes(card.word.toLowerCase())
            )
            
            if (isWordOnBoard) {
              console.error(`Invalid hint "${hint.word}" - word is on the board`)
              return res.status(400).json({ error: 'Invalid hint - word is on the board' })
            }

            currentClue = hint.word
            currentNumber = hint.number
            console.log(`[AI Spymaster] ${modelId} gave clue: ${hint.word} (${hint.number})`)
            
            // Record the hint
            await prisma.hint.create({
              data: {
                gameId: id as string,
                team: currentTeam,
                word: hint.word,
                number: hint.number,
                timestamp: new Date()
              }
            })

            // Don't switch teams after giving a hint
          } else {
            if (currentRole === 'operative') {
              // Only make a guess if there's a clue from YOUR team's spymaster
              const latestHint = game.hints
                .filter(h => h.team === currentTeam)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

              if (!latestHint || !game.currentClue) {
                console.error('Operative tried to guess without their spymaster giving a hint')
                return res.status(400).json({ error: 'No clue available from your spymaster' })
              }

              let keepGuessing = true;
              while (keepGuessing) {
                // Stop if game has ended
                if (winner) break;

                // Update context with current game state before each guess
                const updatedContext: GameContext = {
                  ...context,
                  unrevealedCards: gameState.cards
                    .map((card: GameCard, index: number) => ({ 
                      word: card.word, 
                      index 
                    }))
                    .filter(card => !gameState.cards[card.index].revealed),
                  guessesThisTurn: game.moves.filter(m => 
                    m.teamTurn === currentTeam && 
                    m.createdAt > game.turnStartedAt!
                  ).length,
                  previousGuesses: game.moves
                    .filter(m => m.teamTurn === currentTeam)
                    .map(m => ({
                      word: gameState.cards[m.cardIndex].word,
                      type: m.cardType,
                      success: m.cardType === currentTeam
                    }))
                };

                // Make guess with updated context
                const guess = await getOperativeGuess(modelId, updatedContext, apiKey)
                
                // Stop if trying to guess a revealed card
                if (gameState.cards[guess.cardIndex].revealed) {
                  console.error('AI tried to guess revealed card')
                  break
                }

                // Make the guess
                gameState.cards[guess.cardIndex].revealed = true
                
                // Record the move
                await prisma.move.create({
                  data: {
                    gameId: id as string,
                    playerId: `AI-${modelId}`,
                    cardIndex: guess.cardIndex,
                    cardType: gameState.cards[guess.cardIndex].type,
                    teamTurn: currentTeam
                  }
                })

                // Check if guess was wrong
                const wrongGuess = gameState.cards[guess.cardIndex].type !== currentTeam
                if (wrongGuess) {
                  nextTeam = currentTeam === 'red' ? 'blue' : 'red'
                  shouldClearClue = true
                  break
                }

                // Add artificial delay between guesses
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          }
        }

        // Determine next turn
        if (currentRole === 'operative') {
          // Count valid guesses this turn
          const guessesThisTurn = game.moves.filter(m => 
            m.teamTurn === currentTeam && 
            m.createdAt > game.turnStartedAt!
          ).length

          // Check if this move should end the turn
          const lastMove = game.moves[game.moves.length - 1]
          const wrongGuess = lastMove && lastMove.cardType !== currentTeam
          const maxGuessesReached = guessesThisTurn >= (game.currentNumber || 0)

          if (wrongGuess || maxGuessesReached) {
            nextTeam = currentTeam === 'red' ? 'blue' : 'red'
            shouldClearClue = true  // Clear clue when switching teams
            currentRole = 'spymaster'
          }
          // If correct guess and under max, stay on same team's operative turn
        }

        // If a hint was provided (either from human or AI), save it
        if (hint) {
          await prisma.hint.create({
            data: {
              gameId: id as string,
              team: hint.team,
              word: hint.word,
              number: hint.number,
              timestamp: new Date()
            }
          })
        }

        // Update game state
        const updatedGame = await prisma.game.update({
          where: { id: id as string },
          data: {
            gameState,
            winner,
            endReason,
            completedAt: winner ? new Date() : undefined,
            currentTeam: winner ? currentTeam : nextTeam,
            currentClue: shouldClearClue ? null : currentClue ?? game.currentClue,
            currentNumber: shouldClearClue ? null : currentNumber ?? game.currentNumber,
            turnStartedAt: shouldClearClue ? new Date() : game.turnStartedAt,
            // Ensure next team starts with spymaster
            clueGiver: shouldClearClue ? null : game.clueGiver
          },
          include: {
            players: true,
            moves: true,
            hints: true
          }
        })

        return res.status(200).json(updatedGame)

      } catch (error) {
        console.error('Game update error:', error)
        return res.status(500).json({ error: 'Error updating game' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Authentication error' })
  }
}