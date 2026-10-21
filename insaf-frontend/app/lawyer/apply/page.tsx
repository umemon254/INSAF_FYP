'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']

export default function Apply() {
  const [f, setF] = useState({ full_name: '', phone: '', bar_council_id: '' })
  const [specs, setSpecs] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [cnic, setCnic] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      const r = await supabase.from('lawyer_applications').select('status')
        .eq('user_id', data.user.id).maybeSingle()
      if (r.data) setStatus(r.data.status)
    })
  }, [])

  async function submit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !photo || !cnic || !specs.length) return setMsg('Fill all fields, add both pictures and pick a specialization.')

    const picPath = `${user.id}/${Date.now()}`
    const cnicPath = `${user.id}/${Date.now()}`

    const a = await supabase.storage.from('lawyer-pictures').upload(picPath, photo)
    if (a.error) return setMsg(a.error.message)
    const b = await supabase.storage.from('cnic-images').upload(cnicPath, cnic)
    if (b.error) return setMsg(b.error.message)

    const { error } = await supabase.from('lawyer_applications').insert({
      ...f, user_id: user.id, email: user.email, specializations: specs,
      picture_path: picPath, cnic_path: cnicPath,
    })
    if (error) return setMsg(error.message)
    setStatus('pending')
  }

  if (status) return <h2>Your application is {status}.</h2>

  return (
    <div>
      <h1>Lawyer Registration</h1>
      <input placeholder="Full name" onChange={e => setF({ ...f, full_name: e.target.value })} />
      <input placeholder="Phone number" onChange={e => setF({ ...f, phone: e.target.value })} />
      <input placeholder="Bar Council ID" onChange={e => setF({ ...f, bar_council_id: e.target.value })} />
      <p>Profile picture</p>
      <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
      <p>CNIC (PDF file)</p>
      <input type="file" accept="application/pdf" onChange={e => setCnic(e.target.files?.[0] ?? null)} />
      {SPECS.map(s => (
        <label key={s} style={{ marginRight: 12 }}>
          <input type="checkbox"
            onChange={e => setSpecs(e.target.checked ? [...specs, s] : specs.filter(x => x !== s))} />{s}
        </label>
      ))}
      <button onClick={submit}>Submit for approval</button>
      <p>{msg}</p>
    </div>
  )
}