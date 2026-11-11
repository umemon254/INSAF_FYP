'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, logoutAndRedirect } from '@/lib/supabase'

// small line icons for the settings rows (24x24 SVG paths)
const ICONS = {
  invite: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16v-4 M12 8h.01',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
}

const Icon = ({ d }: { d: string }) => (
  <span className="st-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg></span>
)

export default function Settings() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dark, setDark] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const r = await supabase.from('profiles').select('full_name').eq('id', data.user.id).single()
      setName(r.data?.full_name ?? '')
    })
  }, [])

  // theme is saved in this browser only (localStorage), ThemeLoader puts it back on every page
  function toggleTheme() {
    const next = !dark
    setDark(next)
    if (next) document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    try { localStorage.setItem('insaf-theme', next ? 'dark' : 'light') } catch {}
  }

  // phones open the share menu (WhatsApp etc.), computers copy the link
  async function invite() {
    const link = window.location.origin
    const text = 'Understand your legal rights and find a verified lawyer on INSAF.'
    try {
      if (navigator.share) await navigator.share({ title: 'INSAF', text, url: link })
      else { await navigator.clipboard.writeText(link); setMsg('Link copied. Send it to your friend.') }
    } catch { /* user closed the share menu */ }
  }

  return (
    <div>
      <h1>Settings</h1>

      <div className="st-profile">
        <span className="avatar">{name[0]?.toUpperCase() || '?'}</span>
        <div>
          <b>{name}</b>
          <p>{email}</p>
        </div>
      </div>
      <p className="st-note">Wrong name? Email the admin at <a href="mailto:insaf.team3@gmail.com">insaf.team3@gmail.com</a> from the email you signed up with, and they will correct it.</p>

      <div className="st-list">
        <button type="button" className="st-row" onClick={invite}>
          <Icon d={ICONS.invite} />
          <span><b>Invite a friend</b><small>Share the INSAF link</small></span>
        </button>
        {msg && <p className="ld-msg ok">{msg}</p>}

        <button type="button" className="st-row" onClick={toggleTheme}>
          <Icon d={ICONS.moon} />
          <span><b>Theme</b><small>{dark ? 'Dark' : 'Light'}</small></span>
          <span className={dark ? 'st-switch on' : 'st-switch'} />
        </button>

        <div className="st-row st-off">
          <Icon d={ICONS.bell} />
          <span><b>Notifications</b><small>Email and app alerts</small></span>
          <span className="lp-soon">Soon</span>
        </div>

        <div className="st-row st-off">
          <Icon d={ICONS.globe} />
          <span><b>Language</b><small>English (Urdu coming later)</small></span>
          <span className="lp-soon">Soon</span>
        </div>

        <Link href="/forgot-password" className="st-row">
          <Icon d={ICONS.lock} />
          <span><b>Change password</b><small>We send a reset code to your email</small></span>
        </Link>

        <Link href="/dashboard/help" className="st-row">
          <Icon d={ICONS.help} />
          <span><b>Help</b><small>FAQs and contact us</small></span>
        </Link>

        <Link href="/dashboard/about" className="st-row">
          <Icon d={ICONS.info} />
          <span><b>About INSAF</b><small>What INSAF is and how it works</small></span>
        </Link>

        <button type="button" className="st-row st-danger" onClick={logoutAndRedirect}>
          <Icon d={ICONS.logout} />
          <span><b>Logout</b></span>
        </button>
      </div>
    </div>
  )
}
