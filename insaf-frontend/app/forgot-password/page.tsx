'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase , passwordError} from '@/lib/supabase'

export default function ForgotPassword() {
  const router = useRouter()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

    async function sendCode() {
    setBusy(true); setMsg('Sending the code, this can take a few seconds...')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setBusy(false)
    if (error) return setMsg(error.message)
    setSent(true); setCode('')
    setMsg('Code sent. Use the code from the newest email only.')
  }

  async function reset() {
    const pe = passwordError(pass)
    if (pe) return setMsg(pe)
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
          <div className="pw">
            <input type={show ? 'text' : 'password'} placeholder="New password" value={pass}
              onChange={e => setPass(e.target.value)} />
            <button type="button" className={show ? 'eye off' : 'eye'}
              onClick={() => setShow(!show)} aria-label="Show or hide password" />
          </div>
          <p className="hint">At least 8 characters, with 1 uppercase letter, 1 number and 1 symbol.</p>
          <button onClick={reset}>Reset password</button>
          <button onClick={sendCode}>Send a new code</button>
        </>
      )}
      <p className="error">{msg}</p>
    </div>
  )
}