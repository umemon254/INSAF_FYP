'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function go(id: string) {
    const admin = await supabase.from('admins').select('user_id').eq('user_id', id).maybeSingle()
    if (admin.error) throw new Error('Admin check failed: ' + admin.error.message)
    if (admin.data) return window.location.replace('/admin')
    // approved lawyers have a row in lawyer_directory, they get their own dashboard
    const lawyer = await supabase.from('lawyer_directory').select('user_id').eq('user_id', id).maybeSingle()
    window.location.replace(lawyer.data ? '/lawyer/dashboard' : '/')   // normal users go to the home page
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('insaf_email')   // email typed at sign-up
    if (saved) { setEmail(saved); sessionStorage.removeItem('insaf_email') }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go(data.session.user.id).catch(e => setMsg(e.message))
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setMsg('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      await go(data.user.id)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setBusy(false)   // always give the button back, even after an error
    }
  }

  return (
    <div className="auth auth-split">
      <Link href="/" className="auth-brand"><img src="/insaf-logo.svg" alt="" />INSAF</Link>
      <aside className="auth-side">
        <img src="/insaf-logo.svg" alt="" />
        <h2>Your legal help starts here</h2>
        <p>Understand your legal rights and find the right lawyer.</p>
        <ul>
          <li>Lawyers checked by our admin team</li>
          <li>Pakistani law in simple words</li>
          <li>Free to sign up</li>
        </ul>
      </aside>
      <div className="auth-form">
        <h1>Login</h1>
        <p className="auth-sub">Welcome back. Log in to your account.</p>
        <form onSubmit={handleLogin}>
          <input type="email" name="email" placeholder="Email" autoComplete="username"
            value={email} onChange={e => setEmail(e.target.value)} />
          <div className="pw">
            <input type={show ? 'text' : 'password'} name="password" placeholder="Password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className={show ? 'eye off' : 'eye'}
              onClick={() => setShow(!show)} aria-label="Show or hide password" />
          </div>
          <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Login'}</button>
        </form>
        <p className="error">{msg}</p>
        <p className="auth-links"><Link href="/forgot-password">Forgot password?</Link> <Link href="/signup">Create an account</Link></p>
      </div>
    </div>
  )
}
