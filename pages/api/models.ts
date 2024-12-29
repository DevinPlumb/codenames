import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAvailableModels } from '@/utils/models'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        openaiApiKey: true,
        anthropicKey: true 
      }
    })

    const models = await getAvailableModels(
      user?.openaiApiKey || undefined,
      user?.anthropicKey || undefined
    )
    
    return res.status(200).json(models)
  } catch (error) {
    console.error('Error fetching models:', error)
    return res.status(500).json({ error: 'Error fetching models' })
  }
} 