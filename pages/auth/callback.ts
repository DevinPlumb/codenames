import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = req.query.code as string

  if (code) {
    const supabase = createPagesServerClient({ req, res })
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      await prisma.user.upsert({
        where: { id: session.user.id },
        update: { email: session.user.email },
        create: {
          id: session.user.id,
          email: session.user.email
        }
      })

      return res.redirect('/settings')
    }
  }

  res.redirect('/auth')
} 