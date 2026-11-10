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
    window.location.replace(admin.data ? '/admin' : '/dashboard')
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
    } catch (err: any) {
      setMsg(err.message || 'Login failed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1>Login</h1>
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
      <Link href="/forgot-password">Forgot password?</Link> | <Link href="/signup">Sign up</Link>
    </div>
  )
}