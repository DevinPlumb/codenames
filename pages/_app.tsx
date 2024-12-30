import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <>
      <Head>
        <link rel="icon" href="data:," />
      </Head>
      <SessionContextProvider supabaseClient={supabaseClient}>
        <Component {...pageProps} />
      </SessionContextProvider>
    </>
  )
} 