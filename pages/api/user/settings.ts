import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey })
    await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
    return true
  } catch (error) {
    console.error('OpenAI validation error:', error)
    return false
  }
}

async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const anthropic = new Anthropic({ apiKey })
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
    return true
  } catch (error) {
    console.error('Anthropic validation error:', error)
    return false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.method === 'PATCH') {
      const { openaiApiKey, anthropicKey } = req.body

      // Validate keys and collect results
      const validationResults = {
        openai: { valid: true, message: '' },
        anthropic: { valid: true, message: '' }
      }

      if (openaiApiKey) {
        const isValid = await validateOpenAIKey(openaiApiKey)
        validationResults.openai = {
          valid: isValid,
          message: isValid ? 'Valid' : 'Invalid OpenAI API key'
        }
      }

      if (anthropicKey) {
        const isValid = await validateAnthropicKey(anthropicKey)
        validationResults.anthropic = {
          valid: isValid,
          message: isValid ? 'Valid' : 'Invalid Anthropic API key'
        }
      }

      // Only update if all provided keys are valid
      const allValid = (!openaiApiKey || validationResults.openai.valid) && 
                      (!anthropicKey || validationResults.anthropic.valid)

      if (allValid) {
        const user = await prisma.user.update({
          where: { id: session.user.id },
          data: {
            openaiApiKey: openaiApiKey || null,
            anthropicKey: anthropicKey || null
          }
        })

        return res.status(200).json({
          saved: true,
          message: 'Settings updated successfully',
          validationResults,
          openaiApiKey: !!openaiApiKey,
          anthropicKey: !!anthropicKey
        })
      } else {
        return res.status(400).json({
          saved: false,
          message: 'Invalid API key(s)',
          validationResults
        })
      }
    }

    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          openaiApiKey: true,
          anthropicKey: true 
        }
      })

      return res.status(200).json({
        openaiApiKey: !!user?.openaiApiKey,
        anthropicKey: !!user?.anthropicKey,
        openaiApiKeyLength: user?.openaiApiKey?.length || 0,
        anthropicKeyLength: user?.anthropicKey?.length || 0
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Settings error:', error)
    return res.status(500).json({ error: 'Error processing request' })
  }
} 