'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const r = await supabase.from('profiles').select('full_name').eq('id', data.user.id).single()
      setName(r.data?.full_name ?? '')
    })
  }, [])

  return (
    <div>
      <h1>Settings</h1>
      <p>Name: <b>{name}</b><br />Email: {email}</p>
      <p><i>Wrong name? Email the admin at <a href="mailto:umemon254@gmail.com">umemon254@gmail.com</a> from the email you signed up with, and they will correct it.</i></p>
    </div>
  )
}