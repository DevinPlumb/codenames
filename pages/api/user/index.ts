import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('User API called with method:', req.method)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createPagesServerClient({ req, res })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
      return res.status(401).json({ error: 'Session error', details: sessionError })
    }

    if (!session) {
      console.error('No session found')
      return res.status(401).json({ error: 'Unauthorized - No session' })
    }

    console.log('Got session for user:', session.user.id)

    const { id, email } = req.body
    console.log('Creating user with:', { id, email })

    if (!id || !email) {
      console.error('Missing required fields:', { id, email })
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: { email },
      create: { id, email }
    })
    console.log('User created/updated:', user)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('User creation failed:', error)
    return res.status(500).json({ 
      error: 'Failed to create user', 
      details: error instanceof Error ? error.message : String(error)
    })
  }
} 