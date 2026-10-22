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
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return setMsg(error.message)
    setSent(true)
    setMsg('Code sent to your email.')
  }

  async function reset() {
    const v = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
    if (v.error) return setMsg(v.error.message)
    const u = await supabase.auth.updateUser({ password: pass })
    if (u.error) return setMsg(u.error.message)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
        <div className="auth">
      <h1>Forgot Password</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      {!sent ? (
        <button onClick={sendCode}>Send code</button>
      ) : (
        <>
          <input placeholder="Code from email" value={code} onChange={e => setCode(e.target.value)} />
          <input type="password" placeholder="New password" value={pass} onChange={e => setPass(e.target.value)} />
          <button onClick={reset}>Reset password</button>
        </>
      )}
      <p>{msg}</p>
    </div>
  )
}