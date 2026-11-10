'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase, logoutAndRedirect } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [isLawyer, setIsLawyer] = useState(false)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.replace('/login'); return }
      const r = await supabase.from('lawyer_directory').select('user_id')
        .eq('user_id', data.session.user.id).maybeSingle()
      setIsLawyer(!!r.data)
      setReady(true)
    })
  }, [])

  if (!ready) return <div><p>Loading...</p></div>

  const links = [
    ['/dashboard', 'Home'],
    ['/dashboard/settings', 'Settings'],
    ['/dashboard/about', 'About'],
    ['/dashboard/help', 'Help'],
    isLawyer ? ['/lawyer/dashboard', 'My lawyer profile'] : ['/lawyer/apply', 'I am a lawyer'],
  ]

  return (
    <div className="shell">
      <nav className={open ? 'side open' : 'side'}>
        <div className="side-top">
          <h3>INSAF</h3>
          <button type="button" className="menu-btn" aria-label="Menu" onClick={() => setOpen(!open)} />
        </div>
        <div className="side-links">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'on' : ''} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <span className="spacer" />
          <button onClick={logoutAndRedirect}>Logout</button>
        </div>
      </nav>
      <div className="main">{children}</div>
    </div>
  )
}