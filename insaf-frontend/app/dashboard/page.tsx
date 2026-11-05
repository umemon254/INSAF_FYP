'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, pic } from '@/lib/supabase'

export default function Home() {
  const [name, setName] = useState('')
  const [lawyers, setLawyers] = useState<any[]>([])
  const [appStatus, setAppStatus] = useState('')

    useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) return
      const [p, l, a] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('lawyer_directory').select('user_id, full_name, specializations, picture_path'),
        supabase.from('lawyer_applications').select('status').eq('user_id', user.id).maybeSingle(),
      ])
      setName(p.data?.full_name || user.email || '')
      setLawyers(l.data ?? [])
      if (a.data) setAppStatus(a.data.status)
    })
  }, [])

  return (
    <div>
      <h1>Welcome, {name}</h1>
      {appStatus && <p>Your lawyer application: <b>{appStatus}</b></p>}

      <h2>Lawyers</h2>
      {lawyers.length === 0 && <p>No lawyers found.</p>}
      {lawyers.map(l => (
        <Link key={l.user_id} href={`/lawyer/${l.user_id}`} className="card">
          {l.picture_path && <img src={pic(l.picture_path)} width={50} height={50} alt="" />}
          <br /><b>{l.full_name}</b><br />{l.specializations.join(', ')}
        </Link>
      ))}
    </div>
  )
}