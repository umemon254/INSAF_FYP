
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase, passwordError, cleanName, nameOk } from '@/lib/supabase'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)

  async function finish() {                       // go to Login, handing over only the email
    await supabase.auth.signOut()                 // never stay logged in after sign-up
    sessionStorage.setItem('insaf_email', email.trim())
    window.location.replace('/login')
  }

  async function handleSignup() {
    if (!nameOk(name)) return setMsg('Name can have letters and spaces only (at least 2 letters).')
    const pe = passwordError(password)
    if (pe) return setMsg(pe)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password, options: { data: { full_name: name.trim() } },
    })
    if (error) return setMsg(error.message)
    if (data.user && data.user.identities?.length === 0)
      return setMsg('This email is already registered. Please log in or use Forgot password.')
    if (data.session) return finish()             // "Confirm email" is off: no code needed
    setSent(true)
    setMsg('We sent a verification code to your email.')
  }

  async function verify() {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
    if (error) return setMsg(error.message)
    await finish()
  }

  return (
    <div className="auth auth-split">
      <Link href="/" className="auth-brand"><img src="/insaf-logo.svg" alt="" />INSAF</Link>
      <aside className="auth-side">
        <img src="/insaf-logo.svg" alt="" />
        <h2>Join INSAF</h2>
        <p>Understand your legal rights and find the right lawyer.</p>
        <ul>
          <li>Lawyers checked by our admin team</li>
          <li>Pakistani law in simple words</li>
          <li>Free to sign up</li>
        </ul>
      </aside>
      <div className="auth-form">
        <h1>Sign Up</h1>
        <p className="auth-sub">Create your free INSAF account.</p>
        {!sent ? (
          <>
            <input placeholder="Full name" autoComplete="off" value={name} onChange={e => setName(cleanName(e.target.value))} />
            <input type="email" name="signup-email" placeholder="Email" autoComplete="off"
              value={email} onChange={e => setEmail(e.target.value)} />
            <div className="pw">
              <input type={show ? 'text' : 'password'} name="signup-password" placeholder="Password" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className={show ? 'eye off' : 'eye'}
                onClick={() => setShow(!show)} aria-label="Show or hide password" />
            </div>
            <p className="hint">At least 8 characters, with 1 number and 1 symbol.</p>
            <button onClick={handleSignup}>Sign Up</button>
          </>
        ) : (
          <>
            <input placeholder="Verification code from email" autoComplete="one-time-code"
              value={code} onChange={e => setCode(e.target.value)} />
            <button onClick={verify}>Verify and continue</button>
          </>
        )}
        <p className="error">{msg}</p>
        <p className="auth-links"><Link href="/login">Already have an account? Login</Link></p>
      </div>
    </div>
  )
}
