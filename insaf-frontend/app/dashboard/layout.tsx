'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const links = [
  ['/dashboard', 'Home'],
  ['/dashboard/settings', 'Settings'],
  ['/dashboard/about', 'About'],
  ['/dashboard/help', 'Help'],
  ['/lawyer/apply', 'I am a lawyer'],
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) router.push('/login') })
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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