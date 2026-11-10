'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const AREAS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']

const STEPS = [
  { title: 'Create a free account', text: 'Sign up with your email in under a minute.' },
  { title: 'Find the right lawyer', text: 'Look for a verified lawyer who handles your kind of case.' },
  { title: 'Contact the lawyer', text: "Open the lawyer's profile and reach them by email or phone." },
]

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
  }, [])

  const joinHref = loggedIn ? '/lawyer/apply' : '/login?next=lawyer'
  const findHref = loggedIn ? '/dashboard' : '/login'
  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-wrap">
          <Link href="/" className="lp-logo">INSAF</Link>
          <nav className="lp-menu">
            <a href="#services">Services</a>
            <a href="#areas">Areas of law</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="lp-links">
            <Link href={joinHref} className="lp-outline lp-hide-phone">Join as Lawyer</Link>
            {loggedIn ? (
              <Link href="/dashboard" className="lp-btn">Dashboard</Link>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/signup" className="lp-btn">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="lp-wrap">
          <section className="lp-hero">
            <div>
              <h1>Understand your legal rights. <span>Find the right lawyer.</span></h1>
              <p>INSAF explains Pakistani law in simple words and connects you with verified lawyers.</p>
              <div className="lp-hero-buttons">
                <Link href={loggedIn ? '/dashboard' : '/signup'} className="lp-gold">Get started</Link>
                <Link href={findHref} className="lp-white-outline">Find a lawyer</Link>
              </div>
            </div>
            <svg className="lp-art" viewBox="0 0 120 120" fill="none" stroke="#fff" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="60" cy="12" r="4" />
              <path d="M60 16v84M38 104h44M24 32h72" />
              <path d="M24 32 8 70h32zM96 32 80 70h32z" />
              <path d="M8 70a16 8 0 0 0 32 0M80 70a16 8 0 0 0 32 0" />
            </svg>
          </section>
        </div>

        <section className="lp-section" id="services">
          <div className="lp-wrap">
            <h2>What you can do on INSAF</h2>
            <div className="lp-cards">
              <div className="lp-card">
                <h3>Ask the AI legal assistant</h3>
                <p>Ask about your problem in simple words and get an easy explanation of the law that applies.</p>
                <span className="lp-soon">Coming soon</span>
              </div>
              <div className="lp-card">
                <h3>Find a verified lawyer</h3>
                <p>Browse lawyers checked by our admin team and see what kind of cases they handle.</p>
                <Link href={findHref}>Browse lawyers &rarr;</Link>
              </div>
              <div className="lp-card">
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
            <div className="lp-chips">
              {AREAS.map(a => <span key={a}>{a}</span>)}
            </div>
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
          <p>INSAF gives general legal information, not legal advice. For your own case, please talk to a qualified lawyer.</p>
          <p>&copy; 2026 INSAF</p>
        </div>
      </footer>
    </div>
  )
}