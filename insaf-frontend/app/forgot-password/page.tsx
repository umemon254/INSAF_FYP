'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const router = useRouter()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')

  async function sendCode() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) return setMsg(error.message)
    setSent(true)
    setCode('')
    setMsg('Code sent. Use the code from the newest email only.')
  }

  async function reset() {
    if (pass.length < 6) return setMsg('Password must be at least 6 characters.')
    const v = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
    if (v.error) return setMsg('Code error: ' + v.error.message)
    const u = await supabase.auth.updateUser({ password: pass })
    if (u.error) return setMsg('Password error: ' + u.error.message)
    await supabase.auth.signOut()
    setMsg('Password changed. Redirecting to login...')
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <div className="auth">
      <h1>Forgot Password</h1>
      <input placeholder="Email" value={email} disabled={sent} onChange={e => setEmail(e.target.value)} />
      {!sent ? (
        <button onClick={sendCode}>Send code</button>
      ) : (
        <>
          <input placeholder="Code from email" value={code} onChange={e => setCode(e.target.value)} />
          <input type="password" placeholder="New password" value={pass} onChange={e => setPass(e.target.value)} />
          <button onClick={reset}>Reset password</button>
          <button onClick={sendCode}>Send a new code</button>
        </>
      )}
      <p>{msg}</p>
    </div>
  )
}