import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export interface ModelOption {
  id: string
  name: string
  provider: 'openai' | 'anthropic'
}

export async function getAvailableModels(openaiKey?: string, anthropicKey?: string): Promise<ModelOption[]> {
  const models: ModelOption[] = []

  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey })
    try {
      const openaiModels = await openai.models.list()
      models.push(
        ...openaiModels.data
          .filter(model =>
            model.id.includes('gpt')
          && !model.id.includes('realtime')
          && !model.id.includes('audio'))
          .map(model => ({
            id: model.id,
            name: model.id,
            provider: 'openai' as const
          }))
      )
    } catch (error) {
      // Silently handle OpenAI model fetch errors
    }
  }

  if (anthropicKey) {
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    try {
      const anthropicModels = await anthropic.models.list()
      models.push(
        ...anthropicModels.data
          .map(model => ({
            id: model.id,
            name: model.id,
            provider: 'anthropic' as const
          }))
      )
    } catch (error) {
      // Silently handle Anthropic model fetch errors
    }
  }

  // Sort models by provider and name
  return models.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider)
    }
    return a.name.localeCompare(b.name)
  })
}

export async function fetchOpenAIModels(apiKey: string): Promise<ModelOption[]> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await res.json()
    return data.data
      .filter((model: any) => model.id.startsWith('gpt-4') || model.id.startsWith('gpt-3.5-turbo'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'openai'
      }))
  } catch (error) {
    return []
  }
}

export async function fetchAnthropicModels(apiKey: string): Promise<ModelOption[]> {
  try {
    // Anthropic doesn't have a models endpoint yet, so we'll hardcode the available models
    return [
      { id: 'claude-2', name: 'Claude 2', provider: 'anthropic' },
      { id: 'claude-instant-1', name: 'Claude Instant', provider: 'anthropic' }
    ]
  } catch (error) {
    return []
  }
} 