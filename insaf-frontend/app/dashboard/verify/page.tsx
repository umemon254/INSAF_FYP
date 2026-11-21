'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, fmtCnic, fileError, onlyDigits } from '@/lib/supabase'

// Users upload their CNIC front and back once, with their phone and city. The admin
// checks it, and after approval they can book appointments.
export default function VerifyCnic() {
  const [userId, setUserId] = useState('')
  const [row, setRow] = useState<any>(undefined)   // undefined = loading, null = not uploaded yet
  const [cnic, setCnic] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      const r = await supabase.from('user_verifications').select('*').eq('user_id', data.user.id).maybeSingle()
      setRow(r.data)
      if (r.data) { setCnic(r.data.cnic); setPhone(r.data.phone ?? ''); setCity(r.data.city ?? '') }
    })
  }, [])

  async function submit() {
    if (!/^\d{5}-\d{7}-\d$/.test(cnic)) return setMsg('Enter your CNIC number like 12345-1234567-1.')
    if (!/^\d{11}$/.test(phone)) return setMsg('Phone number must be exactly 11 digits.')
    if (city.trim().length < 2) return setMsg('Enter your city.')
    if (!front || !back) return setMsg('Upload both sides of your CNIC.')
    const bad = fileError(front) || fileError(back)
    if (bad) return setMsg(bad)

    setBusy(true); setMsg('')
    const frontPath = `${userId}/${Date.now()}-cnic-front`
    const backPath = `${userId}/${Date.now()}-cnic-back`
    const up1 = await supabase.storage.from('cnic-images').upload(frontPath, front)
    const up2 = up1.error ? up1 : await supabase.storage.from('cnic-images').upload(backPath, back)
    if (up2.error) { setBusy(false); return setMsg(up2.error.message) }

    const data = { cnic, phone, city: city.trim(), front_path: frontPath, back_path: backPath, status: 'pending', rejection_reason: null }
    // first time: insert. After a rejection: update the same row.
    const r = row
      ? await supabase.from('user_verifications').update(data).eq('user_id', userId).select().single()
      : await supabase.from('user_verifications').insert({ user_id: userId, ...data }).select().single()
    setBusy(false)
    if (r.error?.code === '23505') return setMsg('This CNIC is already used by another account.')
    if (r.error) return setMsg(r.error.message)
    setRow(r.data)
  }

  if (row === undefined) return <p>Loading...</p>

  return (
    <div>
      <h1>Verify your CNIC</h1>
      <p>To keep INSAF safe for lawyers, we check every user once before they can book an appointment.
        Only the admin can see your CNIC. Lawyers you book with see only your phone and city.</p>

      {row?.status === 'approved' && (
        <p className="ld-msg ok">Your CNIC is verified. You can now <Link href="/#lawyers">book an appointment</Link>.</p>
      )}
      {row?.status === 'pending' && (
        <p className="ld-msg ok">Thanks. Your CNIC is waiting for the admin to check it.</p>
      )}
      {row?.status === 'rejected' && (
        <p className="ld-msg">Your CNIC was not approved. Reason: {row.rejection_reason || 'no reason given'}</p>
      )}

      {(!row || row.status === 'rejected') && (
        <div className="ld-grid book-form">
          <label className="ld-full">CNIC number
            <input placeholder="12345-1234567-1" inputMode="numeric" value={cnic} onChange={e => setCnic(fmtCnic(e.target.value))} />
          </label>
          <label>Phone number
            <input placeholder="03001234567" inputMode="numeric" maxLength={11} value={phone}
              onChange={e => setPhone(onlyDigits(e.target.value, 11))} />
          </label>
          <label>City
            <input placeholder="For example Karachi" maxLength={50} value={city} onChange={e => setCity(e.target.value)} />
          </label>
          <label>CNIC front (picture or PDF)
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFront(e.target.files?.[0] ?? null)} />
          </label>
          <label>CNIC back (picture or PDF)
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setBack(e.target.files?.[0] ?? null)} />
          </label>
          {msg && <p className="ld-msg ld-full">{msg}</p>}
          <div className="ld-actions ld-full">
            <button onClick={submit} disabled={busy}>{busy ? 'Uploading...' : 'Submit for checking'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
