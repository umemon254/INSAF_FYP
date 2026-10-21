'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function handleSignup() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return setMsg(error.message)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div>
      <h1>Sign Up</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleSignup}>Sign Up</button>
      <p>{msg}</p>
      <Link href="/login">Already have an account? Login</Link>
    </div>
  )
}