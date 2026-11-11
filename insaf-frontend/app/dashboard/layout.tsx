'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, logoutAndRedirect } from '@/lib/supabase'

// Settings, About and Help pages: a card with a back arrow to the home page
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // getUser() asks Supabase, so a deleted or expired account is sent back to login
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { logoutAndRedirect(); return }
      setReady(true)
    })
  }, [])

  if (!ready) return <div><p>Loading...</p></div>

  return (
    <div className="ld info-page">
      <div className="titlebar">
        <Link href="/" className="back" aria-label="Back to home">←</Link>
        <Link href="/" className="lp-logo"><img src="/insaf-logo.svg" alt="" />INSAF</Link>
      </div>
      <section className="ld-card">{children}</section>
    </div>
  )
}
