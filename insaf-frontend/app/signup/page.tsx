'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase , passwordError } from '@/lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)

  async function handleSignup() {
    if (!name.trim()) return setMsg('Please enter your name.')
    const pe = passwordError(password)
    if (pe) return setMsg(pe)
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name.trim() } },
    })
    if (error) return setMsg(error.message)
    if (data.user && data.user.identities?.length === 0)
      return setMsg('This email is already registered. Please log in or use Forgot password.')
    if (data.session) {            // "Confirm email" is off: no code needed
      await supabase.auth.signOut()
      return router.push('/login')
    }
    setSent(true)
    setMsg('We sent a verification code to your email.')
  }

  async function verify() {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' })
    if (error) return setMsg(error.message)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="auth">
      <h1>Sign Up</h1>
      {!sent ? (
        <>
          <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <div className="pw">
            <input type={show ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} />
            <button type="button" className={show ? 'eye off' : 'eye'}
              onClick={() => setShow(!show)} aria-label="Show or hide password" />
          </div>
          <p className="hint">At least 8 characters, with 1 uppercase letter, 1 number and 1 symbol.</p>
          <button onClick={handleSignup}>Sign Up</button>
        </>
      ) : (
        <>
          <input placeholder="Verification code from email" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={verify}>Verify and continue</button>
        </>
      )}
      <p>{msg}</p>
      <Link href="/login">Already have an account? Login</Link>
    </div>
  )
}