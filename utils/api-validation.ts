import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { APIError } from '@/types/api'

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false
  
  const openai = new OpenAI({ apiKey })
  
  try {
    await openai.models.list()
    return true
  } catch (err) {
    const error = err as APIError
    console.error('OpenAI key validation failed:', {
      message: error.message,
      status: error.status,
      code: error.code
    })
    return false
  }
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false
  
  const anthropic = new Anthropic({ apiKey })
  
  try {
    await anthropic.models.list()
    return true
  } catch (err) {
    const error = err as APIError
    console.error('Anthropic key validation failed:', {
      message: error.message,
      status: error.status,
      code: error.code
    })
    return false
  }
} 