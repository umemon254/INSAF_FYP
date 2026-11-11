'use client'
import { useEffect, useState } from 'react'
import { supabase, logoutAndRedirect } from '@/lib/supabase'
import Navbar from '../Navbar'

// Settings, About and Help pages: the top bar, then the page in a white card
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
    <>
      <Navbar />
      <div className="ld info-page">
        <section className="ld-card">{children}</section>
      </div>
    </>
  )
}
