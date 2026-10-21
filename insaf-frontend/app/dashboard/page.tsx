'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, pic } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']

export default function Dashboard() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [lawyers, setLawyers] = useState<any[]>([])
  const [appStatus, setAppStatus] = useState('')
  const [search, setSearch] = useState('')
  const [spec, setSpec] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/login')
      setEmail(data.user.email ?? '')
      const l = await supabase.from('lawyer_directory')
        .select('user_id, full_name, specializations, picture_path')
      setLawyers(l.data ?? [])
      const a = await supabase.from('lawyer_applications').select('status')
        .eq('user_id', data.user.id).maybeSingle()
      if (a.data) setAppStatus(a.data.status)
    })
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const shown = lawyers.filter(l =>
    l.full_name.toLowerCase().includes(search.toLowerCase()) &&
    (!spec || l.specializations.includes(spec))
  )

  return (
    <div>
      <h1>Welcome</h1>
      <p>{email}</p>

      <h2>Find a lawyer</h2>
      <input placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)} />
      <select value={spec} onChange={e => setSpec(e.target.value)}>
        <option value="">All specializations</option>
        {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {shown.length === 0 && <p>No lawyers found.</p>}
      {shown.map(l => (
        <Link key={l.user_id} href={`/lawyer/${l.user_id}`} className="card">
          {l.picture_path && <img src={pic(l.picture_path)} width={50} height={50} alt="" />}
          <br /><b>{l.full_name}</b><br />{l.specializations.join(', ')}
        </Link>
      ))}

      <hr />
      <p>
        {appStatus
          ? <>Your lawyer application: <b>{appStatus}</b></>
          : <>Are you a lawyer? <Link href="/lawyer/apply">Apply here</Link></>}
      </p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}