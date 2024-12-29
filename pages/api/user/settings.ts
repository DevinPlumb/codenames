import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import { validateOpenAIKey, validateAnthropicKey } from '@/utils/api-validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create supabase server client
  const supabase = createPagesServerClient({ req, res })
  
  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    const { openaiApiKey, anthropicKey } = req.body

    try {
      // Validate keys independently
      const [openaiValid, anthropicValid] = await Promise.all([
        openaiApiKey ? validateOpenAIKey(openaiApiKey) : Promise.resolve(true),
        anthropicKey ? validateAnthropicKey(anthropicKey) : Promise.resolve(true)
      ])

      // Only save if all provided keys are valid
      const allProvidedKeysValid = 
        (!openaiApiKey || openaiValid) && 
        (!anthropicKey || anthropicValid)

      if (allProvidedKeysValid) {
        await prisma.user.upsert({
          where: { id: session.user.id },
          update: { 
            openaiApiKey: openaiApiKey || null,
            anthropicKey: anthropicKey || null
          },
          create: {
            id: session.user.id,
            email: session.user.email,
            openaiApiKey: openaiApiKey || null,
            anthropicKey: anthropicKey || null
          },
        })
      }

      // Return validation results
      return res.status(200).json({ 
        message: allProvidedKeysValid ? 'Settings updated' : 'Invalid API key(s)',
        validationResults: {
          openai: {
            valid: openaiValid,
            message: openaiValid ? 'Valid' : 'Invalid OpenAI API key'
          },
          anthropic: {
            valid: anthropicValid,
            message: anthropicValid ? 'Valid' : 'Invalid Anthropic API key'
          }
        },
        saved: allProvidedKeysValid
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      return res.status(500).json({ error: 'Error saving settings' })
    }
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          openaiApiKey: true,
          anthropicKey: true 
        }
      })

      return res.status(200).json({
        openaiApiKey: user?.openaiApiKey || '',
        anthropicKey: user?.anthropicKey || ''
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      return res.status(500).json({ error: 'Error loading settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
} 