import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { SpymasterContext, OperativeContext, GameState, BaseCard, CardType, Team } from '@/types/game'

export interface SpymasterHint {
  word: string;
  number: number;
  reasoning: string;
}

export interface OperativeGuess {
  cardIndex: number;
  confidence: number;
  reasoning: string;
}

type GameContext = SpymasterContext | OperativeContext;

// Add helper function to safely parse JSON with fallback
function safeJsonParse(content: string, fallback: any) {
  try {
    // Clean up the content - remove any markdown formatting or extra text
    const jsonStart = content.indexOf('{')
    const jsonEnd = content.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return fallback
    
    const jsonString = content.slice(jsonStart, jsonEnd + 1)
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Failed to parse JSON:', error)
    return fallback
  }
}

export async function getSpymasterHint(
  modelId: string,
  context: SpymasterContext,
  apiKey: string
): Promise<SpymasterHint> {
  const isAnthropicModel = modelId.includes('claude')
  const prompt = `You are the ${context.currentTeam} team's spymaster in a game of Codenames.
  
Your goal is to help your team find all their remaining words while avoiding the other team's words and the assassin.

CRITICAL RULES:
1. Your clue CANNOT be any form or part of ANY word visible on the board
2. Your clue must be a single word (no spaces, hyphens, or numbers)
3. Your clue should connect to multiple unrevealed words belonging to your team

Board state (A = Assassin, R = Red, B = Blue, N = Neutral):
${context.cards.map(card => `${card.word} (${card.type})${card.revealed ? ' [REVEALED]' : ''}`).join('\n')}

Words you CANNOT use as clues (or any form/part of these):
${context.cards.map(card => card.word.toLowerCase()).join(', ')}

Your team's remaining words to find: ${context.currentTeam === 'red' ? context.remainingRed : context.remainingBlue}
Unrevealed words:
${context.cards.filter(card => !card.revealed).map(card => card.word).join(', ')}

Respond with ONLY a JSON object in this exact format:
{"word": "your_clue", "number": number_of_related_words, "reasoning": "explanation"}`

  if (isAnthropicModel) {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''
    console.log('Raw Claude response:', content)  // Debug log
    return safeJsonParse(content, {
      word: 'skip',
      number: 1,
      reasoning: 'Failed to parse Claude response'
    })
  } else {
    const openai = new OpenAI({ apiKey })
    try {
      const response = await openai.chat.completions.create({
        model: modelId,
        messages: [
          { 
            role: 'system', 
            content: 'You must respond with a valid JSON object only. No markdown, no backticks, no explanation.' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
      const content = response.choices[0].message.content
      console.log('Raw OpenAI response:', content)
      return JSON.parse(content || '{"word": "skip", "number": 1, "reasoning": "Failed to generate"}')
    } catch (error) {
      console.error('OpenAI error:', error)
      return { word: "skip", number: 1, reasoning: "Error generating hint" }
    }
  }
}

export async function getOperativeGuess(
  modelId: string,
  context: OperativeContext,
  apiKey: string
): Promise<OperativeGuess> {
  const isAnthropicModel = modelId.includes('claude')
  const prompt = `You are the ${context.currentTeam} team's operative in a game of Codenames.

Current clue: "${context.currentClue?.word}" (Number: ${context.currentClue?.number})
This means your spymaster thinks ${context.currentClue?.number} unrevealed words belong to your team and relate to "${context.currentClue?.word}".

CRITICAL RULES:
1. You can ONLY choose from the AVAILABLE UNREVEALED words listed below
2. NEVER select a word that has already been revealed
3. Choose words that have a clear semantic or thematic connection to the clue
4. Your team is ${context.currentTeam.toUpperCase()}, so look for words that your spymaster would connect to the clue

Available unrevealed words to choose from:
${context.cards.filter(card => !card.revealed).map(card => `${card.index}: ${card.word}`).join('\n')}

Previous guesses this turn:
${context.previousGuesses?.map(g => `- "${g.word}" was ${g.success ? 'CORRECT' : 'WRONG'}`).join('\n')}

You MUST select a word from the available unrevealed words list above.
Choose the word with the strongest connection to the clue "${context.currentClue?.word}".

Response format:
{
  "cardIndex": chosen_word_index,
  "confidence": confidence_score,
  "reasoning": "Explain why you chose this word"
}`

  if (isAnthropicModel) {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })
    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''
    return safeJsonParse(content, {
      cardIndex: -1,
      confidence: 0,
      reasoning: 'Failed to parse Claude response'
    })
  } else {
    const openai = new OpenAI({ apiKey })
    try {
      // Try with response_format first (GPT-4 and newer models)
      const response = await openai.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
      return JSON.parse(response.choices[0].message.content!)
    } catch (error: any) {
      // If response_format isn't supported, fall back to standard completion
      if (error?.message?.includes('response_format')) {
        const response = await openai.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: 'You must respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ]
        })
        return JSON.parse(response.choices[0].message.content!)
      }
      throw error
    }
  }
} 