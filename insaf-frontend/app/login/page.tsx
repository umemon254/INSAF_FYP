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

  async function go(id: string) {
    const admin = await supabase.from('admins').select('user_id').eq('user_id', id).maybeSingle()
    if (admin.error) return setMsg('Admin check failed: ' + admin.error.message)
    if (admin.data) return router.replace('/admin')
    const lawyer = await supabase.from('lawyer_directory').select('user_id').eq('user_id', id).maybeSingle()
    router.replace(lawyer.data ? '/lawyer/dashboard' : '/dashboard')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(data.session.user.id) })
  }, [])

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setMsg(error.message)
    go(data.user.id)
  }

  return (
    <div className="auth">
      <h1>Login</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <p>{msg}</p>
      <Link href="/forgot-password">Forgot password?</Link> | <Link href="/signup">Sign up</Link>
    </div>
  )
}