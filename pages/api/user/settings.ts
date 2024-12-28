import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

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
    const { openaiApiKey } = req.body

    try {
      await prisma.user.upsert({
        where: { id: session.user.id },
        update: { openaiApiKey },
        create: {
          id: session.user.id,
          email: session.user.email,
          openaiApiKey,
        },
      })

      return res.status(200).json({ message: 'Settings updated' })
    } catch (error) {
      console.error('Error saving settings:', error)
      return res.status(500).json({ error: 'Error saving settings' })
    }
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { openaiApiKey: true },
      })

      return res.status(200).json(user)
    } catch (error) {
      console.error('Error loading settings:', error)
      return res.status(500).json({ error: 'Error loading settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
} 