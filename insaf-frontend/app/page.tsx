'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, pic } from '@/lib/supabase'
import Navbar, { LAWYER_TYPES } from './Navbar'


// a simple line icon for each lawyer type in "Areas of law" (SVG path, 24x24 box)
const TYPE_ICONS: Record<string, string> = {
  'Estate Planning Lawyer': 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h6 M9 16h6',
  'Personal Injury Lawyer': 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  'Family Lawyer': 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20c0-3 3-6 6-6s6 3 6 6 M14.5 14.5c.5-.3 1-.5 1.5-.5 3 0 6 3 6 6',
  'Immigration Lawyer': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  'Employment Lawyer': 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18',
  'Civil Rights Lawyer': 'M3 10v4h4l6 4V6l-6 4z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
  'Criminal Defense Lawyer': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  'Tax Lawyer': 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h3',
  'Real Estate Lawyer': 'M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6',
  'Intellectual Property (IP) Lawyer': 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  'Corporate Lawyer': 'M4 21V5l8-2v18 M12 9h8v12 M2 21h20 M7 8h2 M7 12h2 M7 16h2 M15 13h2 M15 17h2',
}


type Lawyer = {
  user_id: string; full_name: string; specializations: string[]; services: string | null
  picture_path: string | null; experience_years: number | null; license_level: string | null
}

// the words of a search, without "lawyer" and very short words like "of"
const searchWords = (text: string) =>
  text.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && w !== 'lawyer')

const STEPS = [
  { title: 'Create a free account', text: 'Sign up with your email in under a minute.' },
  { title: 'Find the right lawyer', text: 'Look for a verified lawyer who handles your kind of case.' },
  { title: 'Contact the lawyer', text: "Open the lawyer's profile and reach them by email or phone." },
]

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [search, setSearch] = useState('')
  const [lawyers, setLawyers] = useState<Lawyer[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      setLoggedIn(!!user)
      // the lawyer list is only readable when logged in (Supabase rule)
      if (!user) return
      const l = await supabase.from('lawyer_directory')
        .select('user_id, full_name, specializations, services, picture_path, experience_years, license_level')
      // approved lawyers have a row in lawyer_directory. They get their own dashboard, not this user page.
      if ((l.data ?? []).some(x => x.user_id === user.id)) return window.location.replace('/lawyer/dashboard')
      setLawyers(l.data ?? [])
    })
  }, [])

  // a lawyer matches if any search word is in their specializations or services
  const words = searchWords(search)
  const foundTypes = LAWYER_TYPES.filter(t => t.toLowerCase().includes(search.trim().toLowerCase()))
  const foundLawyers = words.length === 0 ? lawyers : lawyers.filter(l => {
    const text = (l.specializations.join(' ') + ' ' + (l.services ?? '')).toLowerCase()
    return words.some(w => text.includes(w))
  })

  function pickType(type: string) {
    setSearch(type)
  }

  const joinHref = loggedIn ? '/lawyer/apply' : '/login?next=lawyer'
  const findHref = loggedIn ? '#lawyers' : '/login'
  return (
    <div className="landing">
      <Navbar onPickType={pickType} />

      <main>
        <div className="lp-wrap">
          <section className="lp-hero">
            <div>
              <h1>Understand your legal rights. <span>Find the right lawyer.</span></h1>
              <p>INSAF explains Pakistani law in simple words and connects you with verified lawyers.</p>
              <div className="lp-hero-buttons">
                <Link href={loggedIn ? '#areas' : '/signup'} className="lp-gold">Get started</Link>
                <Link href={findHref} className="lp-white-outline">Find a lawyer</Link>
              </div>
            </div>
            <img className="lp-art" src="/insaf-logo.svg" alt="INSAF logo" />
          </section>
        </div>

        <section className="lp-section" id="services">
          <div className="lp-wrap">
            <h2>What you can do on INSAF</h2>
            <div className="lp-cards">
              <div className="lp-card" id="ai">
                <span className="lp-icon">💬</span>
                <h3>Ask the AI legal assistant</h3>
                <p>Ask about your problem in simple words and get an easy explanation of the law that applies.</p>
                <span className="lp-soon">Coming soon</span>
              </div>
              <div className="lp-card" id="find">
                <span className="lp-icon">🔍</span>
                <h3>Find a verified lawyer</h3>
                <p>Browse lawyers checked by our admin team and see what kind of cases they handle.</p>
                <Link href={findHref}>Browse lawyers &rarr;</Link>
              </div>
              <div className="lp-card" id="join">
                <span className="lp-icon">⚖️</span>
                <h3>Join as a lawyer</h3>
                <p>Are you a lawyer? Send your Bar Council details and get listed after approval.</p>
                <Link href={joinHref}>Apply now &rarr;</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-grey" id="areas">
          <div className="lp-wrap">
            <h2>Areas of law we cover</h2>
            <input className="lp-search" placeholder="Search a lawyer type, specialization or service"
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="lp-areas">
              {foundTypes.map(t => (
                <button key={t} type="button" className={t === search ? 'on' : ''} onClick={() => pickType(t === search ? '' : t)}>
                  <span className="lp-area-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TYPE_ICONS[t]} /></svg>
                  </span>
                  {t.replace(' Lawyer', '')}
                </button>
              ))}
            </div>

            {!loggedIn && (
              <p className="lp-result-note"><Link href="/login">Log in</Link> to see our verified lawyers.</p>
            )}
            {loggedIn && (
              <div id="lawyers">
                <h3 className="lp-results-title">Verified lawyers ({foundLawyers.length})</h3>
                {foundLawyers.length === 0 && <p className="lp-result-note">No verified lawyer found for this search yet.</p>}
                <div className="lp-lawyers">
                  {foundLawyers.map(l => (
                    <Link key={l.user_id} href={`/lawyer/${l.user_id}`} className="lp-lawyer">
                      {l.picture_path
                        ? <img src={pic(l.picture_path)} alt="" />
                        : <span className="avatar">{l.full_name[0]}</span>}
                      <b>{l.full_name}</b>
                      {l.license_level && <small>{l.license_level}</small>}
                      {l.experience_years != null && <small>{l.experience_years} years experience</small>}
                      <div className="lp-tags">{l.specializations.map(s => <span key={s}>{s}</span>)}</div>
                      {l.services && <p>{l.services}</p>}
                      <span className="lp-view">View profile &rarr;</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="lp-section" id="how">
          <div className="lp-wrap">
            <h2>How it works</h2>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="lp-num">{i + 1}</span>
                  <div><h3>{s.title}</h3><p>{s.text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <p className="lp-footer-logo"><img src="/insaf-logo.svg" alt="" />INSAF</p>
          <p>INSAF gives general legal information, not legal advice. For your own case, please talk to a qualified lawyer.</p>
          <p>&copy; 2026 INSAF</p>
        </div>
      </footer>
    </div>
  )
}