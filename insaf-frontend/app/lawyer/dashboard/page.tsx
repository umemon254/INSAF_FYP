'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, pic , onlyDigits } from '@/lib/supabase'
import Link from 'next/link'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate' , 'Other']

export default function LawyerDashboard() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/login')
      const r = await supabase.from('lawyer_directory').select('*').eq('user_id', data.user.id).maybeSingle()
      if (!r.data) return router.push('/dashboard')
      setMe(r.data); setPhone(r.data.phone); setSpecs(r.data.specializations)
    })
  }, [router])

  async function save() {
    if (!/^\d{11}$/.test(phone)) return setMsg('Phone number must be exactly 11 digits.')
    if (!specs.length) return setMsg('Pick at least one specialization.')
    const row: any = { phone, specializations: specs }
    if (photo) {
      const p = `${me.user_id}/${Date.now()}-pic`
      const up = await supabase.storage.from('lawyer-pictures').upload(p, photo)
      if (up.error) return setMsg(up.error.message)
      row.picture_path = p
    }
    const r = await supabase.from('lawyer_directory').update(row).eq('user_id', me.user_id).select()
    if (r.error) return setMsg(r.error.message)
    if (!r.data?.length) return setMsg('Not saved: permission missing. Run the SQL rules first.')
    setMe({ ...me, ...row }); setPhoto(null); setMsg('Saved.')
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!me) return <p>Loading...</p>
  return (
    <div>
      <div className="titlebar">
        <Link href="/dashboard" className="back" aria-label="Back to dashboard">🡨</Link>
        <h1>Lawyer Dashboard</h1>
      </div>
      {me.picture_path && <img src={pic(me.picture_path)} width={120} alt="" />}
      <h2>{me.full_name}</h2>
      <p>Email: {me.email}</p>
      <p><i>Name, email and Bar Council ID cannot be changed here. Email the admin for a correction.</i></p>

      <h2>Update your profile</h2>
      <input placeholder="Phone number (03001234567)" inputMode="numeric" maxLength={11} value={phone}
       onChange={e => setPhone(onlyDigits(e.target.value, 11))} />
      <p>New profile picture (optional)</p>
      <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '10px 0' }}>
        {SPECS.map(s => (
          <label key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={specs.includes(s)}
              onChange={e => setSpecs(e.target.checked ? [...specs, s] : specs.filter(x => x !== s))} />{s}
          </label>
        ))}
      </div>
      <button onClick={save}>Save changes</button>
      <p>{msg}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}