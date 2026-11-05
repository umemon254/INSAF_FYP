'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  async function go(id: string) {
    const admin = await supabase.from('admins').select('user_id').eq('user_id', id).maybeSingle()
    if (admin.error) return setMsg('Admin check failed: ' + admin.error.message)
    if (admin.data) return router.replace('/admin')
    router.replace('/dashboard')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(data.session.user.id) })
  }, [])

   async function handleLogin() {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setBusy(false); return setMsg(error.message) }
    await go(data.user.id)
  }

  return (
    <div className="auth">
      <h1>Login</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <div className="pw">
        <input type={show ? 'text' : 'password'} placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} />
        <button type="button" className={show ? 'eye off' : 'eye'}
          onClick={() => setShow(!show)} aria-label="Show or hide password" />
      </div>
      <button onClick={handleLogin} disabled={busy}>{busy ? 'Please wait...' : 'Login'}</button>
      <p>{msg}</p>
      <Link href="/forgot-password">Forgot password?</Link> | <Link href="/signup">Sign up</Link>
    </div>
  )
}