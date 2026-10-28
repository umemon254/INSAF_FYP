'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']

export default function Apply() {
  const [f, setF] = useState({ full_name: '', phone: '', bar_council_id: '' })
  const [specs, setSpecs] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [cnic, setCnic] = useState<File | null>(null)
  const [app, setApp] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      const r = await supabase.from('lawyer_applications').select('*').eq('user_id', data.user.id).maybeSingle()
      if (r.data) {
        setApp(r.data)
        setF({ full_name: r.data.full_name, phone: r.data.phone, bar_council_id: r.data.bar_council_id })
        setSpecs(r.data.specializations)
      }
    })
  }, [])

  const status = app?.status ?? ''
  const editing = status === 'pending'

  async function submit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !f.full_name || !f.phone || !f.bar_council_id || !specs.length || (!editing && (!photo || !cnic)))
      return setMsg('Fill all fields, pick a specialization, and add the picture and CNIC PDF.')

    const row: any = { ...f, email: user.email, specializations: specs }
    if (photo) {
      const p = `${user.id}/${Date.now()}-pic`
      const up = await supabase.storage.from('lawyer-pictures').upload(p, photo)
      if (up.error) return setMsg(up.error.message)
      row.picture_path = p
    }
    if (cnic) {
      const p = `${user.id}/${Date.now()}-cnic`
      const up = await supabase.storage.from('cnic-images').upload(p, cnic)
      if (up.error) return setMsg(up.error.message)
      row.cnic_path = p
    }

    const { error } = status
      ? await supabase.from('lawyer_applications').update({ ...row, status: 'pending', rejection_reason: null }).eq('user_id', user.id)
      : await supabase.from('lawyer_applications').insert({ ...row, user_id: user.id })
    if (error) return setMsg(error.message)
    setApp({ ...app, ...row, status: 'pending' })
    setPhoto(null); setCnic(null)
    setMsg(editing ? 'Application updated.' : 'Application sent.')
  }

  if (status === 'approved')
    return (
      <div>
        <h2>Your application is approved.</h2>
        <p>You can update your phone, specializations and picture on your <Link href="/lawyer/dashboard">lawyer dashboard</Link>.</p>
      </div>
    )

  return (
    <div>
      <h1>{editing ? 'Your Application' : 'Lawyer Registration'}</h1>
      {editing && <p>Status: <b>pending</b>. You can still fix your details until the admin reviews them.</p>}
      {status === 'rejected' && (
        <p><b>Your previous application was rejected.</b><br />Reason: {app.rejection_reason}<br />Fix the details and apply again.</p>
      )}
      <input placeholder="Full name" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />
      <input placeholder="Phone number" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
      <input placeholder="Bar Council ID" value={f.bar_council_id} onChange={e => setF({ ...f, bar_council_id: e.target.value })} />
      <p>Profile picture{editing && ' (leave empty to keep the current one)'}</p>
      <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
      <p>CNIC (PDF file){editing && ' (leave empty to keep the current one)'}</p>
      <input type="file" accept="application/pdf" onChange={e => setCnic(e.target.files?.[0] ?? null)} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '10px 0' }}>
        {SPECS.map(s => (
          <label key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={specs.includes(s)}
              onChange={e => setSpecs(e.target.checked ? [...specs, s] : specs.filter(x => x !== s))} />{s}
          </label>
        ))}
      </div>
      <button onClick={submit}>{editing ? 'Update application' : status === 'rejected' ? 'Apply again' : 'Submit for approval'}</button>
      <p>{msg}</p>
    </div>
  )
}