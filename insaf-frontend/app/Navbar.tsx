'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase, logoutAndRedirect } from '@/lib/supabase'

export const LAWYER_TYPES = [
  'Estate Planning Lawyer', 'Personal Injury Lawyer', 'Family Lawyer', 'Immigration Lawyer',
  'Employment Lawyer', 'Civil Rights Lawyer', 'Criminal Defense Lawyer', 'Tax Lawyer',
  'Real Estate Lawyer', 'Intellectual Property (IP) Lawyer', 'Corporate Lawyer',
]

const SERVICES = [
  ['/#ai', 'Ask the AI legal assistant'],
  ['/#areas', 'Find a verified lawyer'],
  ['/#join', 'Join as a lawyer'],
]

// Lodge Complaint dropdown. Not built yet, so every option shows "Soon".
const COMPLAINT_OPTIONS = ['Lodge a new complaint', 'Track previous complaint', 'How complaints work', 'Ask the AI for help']

// The top bar shown on every user page. The home page passes onPickType so a
// lawyer type from the dropdown fills its search box.
export default function Navbar({ onPickType }: { onPickType?: (type: string) => void }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [name, setName] = useState('')
  const [isLawyer, setIsLawyer] = useState(false)
  const [menu, setMenu] = useState('')          // which dropdown is open
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      setLoggedIn(!!user)
      if (!user) return
      const [p, l] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('lawyer_directory').select('user_id').eq('user_id', user.id).maybeSingle(),
      ])
      setName(p.data?.full_name || user.email || '')
      setIsLawyer(!!l.data)
    })

    // close the open dropdown when the user clicks anywhere outside the bar
    const close = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu('')
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const toggle = (name: string) => setMenu(menu === name ? '' : name)
  const joinHref = loggedIn ? '/lawyer/apply' : '/login?next=lawyer'

  return (
    <header className="lp-nav" ref={navRef}>
      <div className="lp-wrap">
        <Link href="/" className="lp-logo"><img src="/insaf-logo.svg" alt="" />INSAF</Link>

        {/* lawyers have their own dashboard, so they don't get the user menu */}
        {!isLawyer && (
          <nav className="lp-menu">
            <div className="lp-drop">
              <button type="button" onClick={() => toggle('lawyers')}>Lawyers ▾</button>
              {menu === 'lawyers' && (
                <div className="lp-drop-list">
                  <b>Find lawyer by type</b>
                  {LAWYER_TYPES.map(t => (
                    <a key={t} href="/#areas" onClick={() => { onPickType?.(t); setMenu('') }}>{t}</a>
                  ))}
                </div>
              )}
            </div>
            <div className="lp-drop">
              <button type="button" onClick={() => toggle('services')}>Services ▾</button>
              {menu === 'services' && (
                <div className="lp-drop-list">
                  {SERVICES.map(([href, label]) => <a key={href} href={href} onClick={() => setMenu('')}>{label}</a>)}
                </div>
              )}
            </div>
            <a href="/#areas">Areas of law</a>
            <a href="/#ai">AI legal assistant <span className="lp-soon">Soon</span></a>
            <div className="lp-drop">
              <button type="button" onClick={() => toggle('complaint')}>Lodge Complaint ▾</button>
              {menu === 'complaint' && (
                <div className="lp-drop-list">
                  {COMPLAINT_OPTIONS.map(o => <span key={o} className="lp-drop-soon">{o} <span className="lp-soon">Soon</span></span>)}
                </div>
              )}
            </div>
            <a href="/#how" className="lp-hide-medium">How it works</a>
          </nav>
        )}

        <div className="lp-links">
          {loggedIn ? (
            <div className="lp-drop">
              <button type="button" className="lp-user" onClick={() => toggle('user')}>
                <span className="avatar">{name[0]?.toUpperCase()}</span>{name} ▾
              </button>
              {menu === 'user' && (
                <div className="lp-drop-list lp-drop-right">
                  {isLawyer
                    ? <Link href="/lawyer/dashboard">My dashboard</Link>
                    : <>
                        <a href="/#lawyers" onClick={() => setMenu('')}>Find a verified lawyer</a>
                        <Link href="/lawyer/apply">Join as a lawyer</Link>
                      </>}
                  <Link href="/dashboard/settings">Settings</Link>
                  <Link href="/dashboard/about">About</Link>
                  <Link href="/dashboard/help">Help</Link>
                  <a onClick={logoutAndRedirect}>Logout</a>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href={joinHref} className="lp-outline lp-hide-phone">Join as Lawyer</Link>
              <Link href="/login">Login</Link>
              <Link href="/signup" className="lp-btn">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
