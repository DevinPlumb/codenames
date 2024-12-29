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
      console.error('Error fetching OpenAI models:', error)
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
      console.error('Error fetching Anthropic models:', error)
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