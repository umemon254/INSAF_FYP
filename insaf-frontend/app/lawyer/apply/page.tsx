'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, onlyDigits, fmtCnic, cleanName, nameOk } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']
const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad', 'Gilgit-Baltistan']

export default function Apply() {
  const [f, setF] = useState({ full_name: '', phone: '', cnic: '', province: '', bar_council_id: '' })
  const [specs, setSpecs] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [cnicFile, setCnicFile] = useState<File | null>(null)
  const [app, setApp] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      const r = await supabase.from('lawyer_applications').select('*').eq('user_id', data.user.id).maybeSingle()
      if (r.data) {
        setApp(r.data)
        setF({
          full_name: r.data.full_name,
          phone: r.data.phone,
          cnic: r.data.cnic ?? '',
          province: r.data.province ?? '',
          bar_council_id: r.data.bar_council_id,
        })
        setSpecs(r.data.specializations)
      }
    })
  }, [])

  const status = app?.status ?? ''
  const editing = status === 'pending'

  async function submit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !f.full_name || !f.bar_council_id || !specs.length || (!editing && (!photo || !cnicFile)))
      return setMsg('Fill all fields, pick a specialization, and add the picture and CNIC PDF.')
    if (!/^\d{11}$/.test(f.phone)) return setMsg('Phone number must be exactly 11 digits, for example 03001234567.')
    if (!nameOk(f.full_name)) return setMsg('Name can have letters and spaces only (at least 2 letters).')
    if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) return setMsg('CNIC must look like 12345-1234567-1.')
    if (!f.province) return setMsg('Select the Bar Council that issued your licence.')
    if (!/^[A-Z0-9/-]{3,20}$/.test(f.bar_council_id))
      return setMsg('Bar Council ID can have letters, numbers, - and / only (3 to 20 characters).')

    const row: any = { ...f, email: user.email, specializations: specs }
    if (photo) {
      const p = `${user.id}/${Date.now()}-pic`
      const up = await supabase.storage.from('lawyer-pictures').upload(p, photo)
      if (up.error) return setMsg(up.error.message)
      row.picture_path = p
    }
    if (cnicFile) {
      const p = `${user.id}/${Date.now()}-cnic`
      const up = await supabase.storage.from('cnic-images').upload(p, cnicFile)
      if (up.error) return setMsg(up.error.message)
      row.cnic_path = p
    }

    const { error } = status
      ? await supabase.from('lawyer_applications').update({ ...row, status: 'pending', rejection_reason: null }).eq('user_id', user.id)
      : await supabase.from('lawyer_applications').insert({ ...row, user_id: user.id })
    if (error) return setMsg(error.message)
    setApp({ ...app, ...row, status: 'pending' })
    setPhoto(null); setCnicFile(null)
    setMsg(editing ? 'Application updated.' : 'Application sent.')
  }

  if (status === 'approved')
    return (
      <div>
        <div className="titlebar">
          <Link href="/dashboard" className="back" aria-label="Back to dashboard">🡨</Link>
          <h2>Your application is approved.</h2>
        </div>
        <p>You can update your phone, specializations and picture on your <Link href="/lawyer/dashboard">lawyer dashboard</Link>.</p>
      </div>
    )

  return (
    <div>
      <div className="titlebar">
        <Link href="/dashboard" className="back" aria-label="Back to dashboard">🡨</Link>
        <h1>{editing ? 'Your Application' : 'Lawyer Registration'}</h1>
      </div>
      {editing && <p>Status: <b>pending</b>. You can still fix your details until the admin reviews them.</p>}
      {status === 'rejected' && (
        <p><b>Your previous application was rejected.</b><br />Reason: {app.rejection_reason}<br />Fix the details and apply again.</p>
      )}

      <input placeholder="Full name" value={f.full_name} onChange={e => setF({ ...f, full_name: cleanName(e.target.value) })} />
      <input placeholder="Phone number (03001234567)" inputMode="numeric" maxLength={11} value={f.phone}
        onChange={e => setF({ ...f, phone: onlyDigits(e.target.value, 11) })} />
      <input placeholder="CNIC number (12345-1234567-1)" inputMode="numeric" maxLength={15} value={f.cnic}
        onChange={e => setF({ ...f, cnic: fmtCnic(e.target.value) })} />

      <select value={f.province} onChange={e => setF({ ...f, province: e.target.value })}>
        <option value="">Bar Council (province)</option>
        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input placeholder="Bar Council ID (as on your licence)" value={f.bar_council_id}
        onChange={e => setF({ ...f, bar_council_id: e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 20) })} />

      <p>Profile picture{editing && ' (leave empty to keep the current one)'}</p>
      <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
      <p>CNIC (PDF file){editing && ' (leave empty to keep the current one)'}</p>
      <input type="file" accept="application/pdf" onChange={e => setCnicFile(e.target.files?.[0] ?? null)} />

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