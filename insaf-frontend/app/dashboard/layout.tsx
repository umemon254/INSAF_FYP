'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [isLawyer, setIsLawyer] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return router.push('/login')
      const r = await supabase.from('lawyer_directory').select('user_id')
        .eq('user_id', data.session.user.id).maybeSingle()
      setIsLawyer(!!r.data)
    })
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    ['/dashboard', 'Home'],
    ['/dashboard/settings', 'Settings'],
    ['/dashboard/about', 'About'],
    ['/dashboard/help', 'Help'],
    isLawyer ? ['/lawyer/dashboard', 'My lawyer profile'] : ['/lawyer/apply', 'I am a lawyer'],
  ]

  return (
    <div className="shell">
      <nav className="side">
        <h3>INSAF</h3>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'on' : ''}>{label}</Link>
        ))}
        <span className="spacer" />
        <button onClick={logout}>Logout</button>
      </nav>
      <div className="main">{children}</div>
    </div>
  )
}