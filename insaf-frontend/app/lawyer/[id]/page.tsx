'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase, pic, CONSULTATION_TYPES, CASE_TYPES } from '@/lib/supabase'

function Detail() {
  const { id } = useParams<{ id: string }>()
  const [l, setL] = useState<any>(null)
  const [booking, setBooking] = useState(false)   // booking form open or closed
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState(CONSULTATION_TYPES[0])
  const [reason, setReason] = useState('')
  const [caseType, setCaseType] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [cnicStatus, setCnicStatus] = useState('')   // '', 'pending', 'approved' or 'rejected'
  const [needCnic, setNeedCnic] = useState(false)

  useEffect(() => {
    supabase.from('lawyer_directory').select('*').eq('user_id', id).single()
      .then(r => setL(r.data))
    // only users with an approved CNIC can book
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const v = await supabase.from('user_verifications').select('status').eq('user_id', data.user.id).maybeSingle()
      setCnicStatus(v.data?.status ?? '')
    })
  }, [id])

  function openForm() {
    setMsg('')
    if (cnicStatus !== 'approved') return setNeedCnic(true)
    setBooking(true)
  }

  // dates allowed in the picker: today up to 60 days ahead
  const dayString = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    return d.toLocaleDateString('en-CA')   // gives YYYY-MM-DD in local time
  }

  // the earliest time a user can book is 1 hour from now
  const soonest = new Date(Date.now() + 60 * 60 * 1000)
  const soonestDate = soonest.toLocaleDateString('en-CA')
  const soonestTime = soonest.toTimeString().slice(0, 5)   // HH:MM in local time
  const soonestLabel = soonest.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })

  async function book() {
    if (!date || !time) return setMsg('Pick a date and time.')
    if (date < soonestDate || date > dayString(60)) return setMsg('Pick a date from today up to 60 days ahead.')
    const when = new Date(`${date}T${time}`)
    if (when < soonest) return setMsg(`Pick a time at least 1 hour from now (${soonestLabel} or later).`)
    if (!caseType) return setMsg('Select the case type.')
    if (reason.trim().length < 3) return setMsg('Write a short reason for the appointment.')

    if (busy) return   // stops a second click from sending the same request again
    setBusy(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setBusy(false); return setMsg('Please log in again.') }
    if (data.user.id === id) { setBusy(false); return setMsg('You cannot book an appointment with yourself.') }

    // is the lawyer already booked within an hour of this time?
    const free = await supabase.rpc('slot_is_free', { p_lawyer: id, p_time: when.toISOString() })
    if (free.data === false) { setBusy(false); return setMsg('The lawyer is already booked near this time. Please pick another time.') }

    const r = await supabase.from('appointments').insert({
      user_id: data.user.id,
      lawyer_id: id,
      appointment_at: when.toISOString(),   // local time saved as UTC
      consultation_type: type,
      reason: reason.trim(),
      case_type: caseType,   // phone and city are copied from the CNIC row by the database
    })
    setBusy(false)
    if (r.error?.code === '23505') return setMsg('You already sent a request to this lawyer for this time. See "My appointments".')
    if (r.error) return setMsg(r.error.message)
    setBooking(false); setDate(''); setTime(''); setReason(''); setCaseType('')
    setMsg('Request sent. The lawyer will accept or reject it. See "My appointments" in your menu.')
  }

  return (
    <div className="ld">
      <div className="titlebar">
        <Link href="/" className="back" aria-label="Back to home">←</Link>
        <h1>Lawyer Profile</h1>
      </div>
      {!l && <p>Loading...</p>}
      {l && (
        <>
          <section className="ld-banner">
            {l.picture_path
              ? <img src={pic(l.picture_path)} alt="" />
              : <span className="ld-avatar">{l.full_name[0]}</span>}
            <div>
              <h2>{l.full_name}</h2>
              <div className="ld-tags">
                <span className="ok">Verified lawyer</span>
                {l.license_level && <span>{l.license_level}</span>}
                {l.experience_years != null && <span>{l.experience_years} years experience</span>}
              </div>
            </div>
          </section>

          <section className="ld-card profile-card">
            <div className="ld-grid">
              <p><small>Email</small>{l.email}</p>
              <p><small>Phone</small>{l.phone}</p>
              <p><small>Specializations</small>{l.specializations.join(', ')}</p>
              {l.qualification && <p><small>Qualification</small>{l.qualification}</p>}
              {l.services && <p className="ld-full"><small>Services</small>{l.services}</p>}
            </div>
            {booking && (
              <div className="ld-grid book-form">
                <label>Date
                  <input type="date" min={soonestDate} max={dayString(60)} value={date} onChange={e => setDate(e.target.value)} />
                </label>
                <label>Time{date === soonestDate && ` (from ${soonestLabel})`}
                  <input type="time" min={date === soonestDate ? soonestTime : undefined} value={time} onChange={e => setTime(e.target.value)} />
                </label>
                <label>Consultation type
                  <select value={type} onChange={e => setType(e.target.value)}>
                    {CONSULTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label>Case type
                  <select value={caseType} onChange={e => setCaseType(e.target.value)}>
                    <option value="">Select case type</option>
                    {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="ld-full">Reason
                  <input placeholder="For example: advice on a property dispute" maxLength={300} value={reason}
                    onChange={e => setReason(e.target.value)} />
                </label>
                <ul className="ld-full book-rules">
                  <li>Your appointment is confirmed only after the lawyer accepts it.</li>
                  <li>If the lawyer doesn&apos;t accept before the time passes, the request expires on its own.</li>
                </ul>
              </div>
            )}
            {needCnic && (
              <p className="ld-msg">
                {cnicStatus === 'pending'
                  ? 'Your CNIC is still waiting for the admin to check it. You can book once it is approved.'
                  : <>Please verify your CNIC first. <Link href="/dashboard/verify">Verify CNIC</Link></>}
              </p>
            )}
            {msg && <p className={msg.startsWith('Request sent') ? 'ld-msg ok' : 'ld-msg'}>{msg}</p>}
            <div className="ld-actions">
              {booking
                ? <>
                    <button onClick={book} disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
                    <button className="ghost" onClick={() => { setBooking(false); setMsg('') }}>Cancel</button>
                  </>
                : <button onClick={openForm}>Book appointment</button>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<p>Loading...</p>}><Detail /></Suspense>
}