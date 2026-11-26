
'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase, pic, CONSULTATION_TYPES, CASE_TYPES } from '@/lib/supabase'
import ReviewList from '../../ReviewList'

function Detail() {
  const { id } = useParams<{ id: string }>()

  const [l, setL] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const [booking, setBooking] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState(CONSULTATION_TYPES[0])
  const [reason, setReason] = useState('')
  const [caseType, setCaseType] = useState('')

  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const [cnicStatus, setCnicStatus] = useState('')
  const [needCnic, setNeedCnic] = useState(false)

  // Load lawyer profile and current user's CNIC verification status.
  useEffect(() => {
    let active = true

    async function loadLawyer() {
      setLoading(true)
      setProfileError('')

      const { data, error } = await supabase
        .from('lawyer_directory')
        .select('*')
        .eq('user_id', id)
        .single()

      if (!active) return

      if (error) {
        setL(null)
        setProfileError(error.message)
      } else {
        setL(data)
      }

      setLoading(false)
    }

    loadLawyer()

    async function loadVerification() {
      const { data } = await supabase.auth.getUser()

      if (!active || !data.user) return

      const v = await supabase
        .from('user_verifications')
        .select('status')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (active) {
        setCnicStatus(v.data?.status ?? '')
      }
    }

    loadVerification()

    return () => {
      active = false
    }
  }, [id])

  function openForm() {
    setMsg('')
    setNeedCnic(false)

    if (cnicStatus !== 'approved') {
      setNeedCnic(true)
      return
    }

    setBooking(true)
  }

  // Today's date up to 60 days ahead.
  const dayString = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    return d.toLocaleDateString('en-CA')
  }

  // Earliest booking time: one hour from now.
  const soonest = new Date(Date.now() + 60 * 60 * 1000)
  const soonestDate = soonest.toLocaleDateString('en-CA')
  const soonestTime = soonest.toTimeString().slice(0, 5)

  const soonestLabel = soonest.toLocaleTimeString('en-PK', {
    hour: 'numeric',
    minute: '2-digit',
  })

  async function book() {
    if (!date || !time) {
      return setMsg('Pick a date and time.')
    }

    if (date < soonestDate || date > dayString(60)) {
      return setMsg('Pick a date from today up to 60 days ahead.')
    }

    const when = new Date(`${date}T${time}`)

    if (when < soonest) {
      return setMsg(
        `Pick a time at least 1 hour from now (${soonestLabel} or later).`
      )
    }

    if (!caseType) {
      return setMsg('Select the case type.')
    }

    if (reason.trim().length < 3) {
      return setMsg('Write a short reason for the appointment.')
    }

    if (busy) return

    setBusy(true)
    setMsg('')

    try {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        setMsg('Please log in again.')
        return
      }

      if (data.user.id === id) {
        setMsg('You cannot book an appointment with yourself.')
        return
      }

      // Check whether the lawyer is already booked near this time.
      const free = await supabase.rpc('slot_is_free', {
        p_lawyer: id,
        p_time: when.toISOString(),
      })

      if (free.error) {
        setMsg(free.error.message)
        return
      }

      if (free.data === false) {
        setMsg(
          'The lawyer is already booked near this time. Please pick another time.'
        )
        return
      }

      // Insert appointment request.
      const r = await supabase.from('appointments').insert({
        user_id: data.user.id,
        lawyer_id: id,
        appointment_at: when.toISOString(),
        consultation_type: type,
        reason: reason.trim(),
        case_type: caseType,
      })

      if (r.error?.code === '23505') {
        setMsg(
          'You already sent a request to this lawyer for this time. See "My appointments".'
        )
        return
      }

      if (r.error) {
        setMsg(r.error.message)
        return
      }

      setBooking(false)
      setDate('')
      setTime('')
      setReason('')
      setCaseType('')

      setMsg(
        'Request sent. The lawyer will accept or reject it. See "My appointments" in your menu.'
      )
    } catch (error: any) {
      setMsg(error.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ld">
      <div className="titlebar">
        <Link href="/" className="back" aria-label="Back to home">
          ←
        </Link>
        <h1>Lawyer Profile</h1>
      </div>

      {loading && <p>Loading lawyer profile...</p>}

      {!loading && !l && (
        <p className="ld-msg">
          {profileError || 'Lawyer profile not found.'}
        </p>
      )}

      {!loading && l && (
        <>
          {/* Lawyer information */}
          <section className="ld-banner">
            {l.picture_path ? (
              <img src={pic(l.picture_path)} alt="" />
            ) : (
              <span className="ld-avatar">
                {l.full_name?.[0] || 'L'}
              </span>
            )}

            <div>
              <h2>{l.full_name}</h2>

              <div className="ld-tags">
                <span className="ok">Verified lawyer</span>

                {l.license_level && (
                  <span>{l.license_level}</span>
                )}

                {l.experience_years != null && (
                  <span>{l.experience_years} years experience</span>
                )}
              </div>
            </div>
          </section>

          {/* Lawyer details and appointment booking */}
          <section className="ld-card profile-card">
            <div className="ld-grid">
              <p>
                <small>Email</small>
                {l.email}
              </p>

              <p>
                <small>Phone</small>
                {l.phone}
              </p>

              <p>
                <small>Specializations</small>
                {Array.isArray(l.specializations)
                  ? l.specializations.join(', ')
                  : 'Not specified'}
              </p>

              {l.qualification && (
                <p>
                  <small>Qualification</small>
                  {l.qualification}
                </p>
              )}

              {l.services && (
                <p className="ld-full">
                  <small>Services</small>
                  {l.services}
                </p>
              )}
            </div>

            {/* Appointment booking form */}
            {booking && (
              <div className="ld-grid book-form">
                <label>
                  Date
                  <input
                    type="date"
                    min={soonestDate}
                    max={dayString(60)}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </label>

                <label>
                  Time
                  {date === soonestDate && ` (from ${soonestLabel})`}
                  <input
                    type="time"
                    min={date === soonestDate ? soonestTime : undefined}
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </label>

                <label>
                  Consultation type
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    {CONSULTATION_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Case type
                  <select
                    value={caseType}
                    onChange={e => setCaseType(e.target.value)}
                  >
                    <option value="">Select case type</option>

                    {CASE_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ld-full">
                  Reason
                  <input
                    placeholder="For example: advice on a property dispute"
                    maxLength={300}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </label>

                <ul className="ld-full book-rules">
                  <li>
                    Your appointment is confirmed only after the lawyer accepts it.
                  </li>
                  <li>
                    If the lawyer doesn't accept before the time passes, the request expires on its own.
                  </li>
                </ul>
              </div>
            )}

            {/* CNIC verification message */}
            {needCnic && (
              <p className="ld-msg">
                {cnicStatus === 'pending'
                  ? 'Your CNIC is still waiting for the admin to check it. You can book once it is approved.'
                  : (
                    <>
                      Please verify your CNIC first.{' '}
                      <Link href="/dashboard/verify">
                        Verify CNIC
                      </Link>
                    </>
                  )}
              </p>
            )}

            {/* Booking status and error messages */}
            {msg && (
              <p
                className={
                  msg.startsWith('Request sent')
                    ? 'ld-msg ok'
                    : 'ld-msg'
                }
              >
                {msg}
              </p>
            )}

            <div className="ld-actions">
              {booking ? (
                <>
                  <button onClick={book} disabled={busy}>
                    {busy ? 'Sending...' : 'Send request'}
                  </button>

                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() => {
                      setBooking(false)
                      setMsg('')
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={openForm}>
                  Book appointment
                </button>
              )}
            </div>
          </section>

          {/* Public lawyer reviews */}
          <section className="ld-card profile-card">
            <h2>Client Reviews</h2>

            <ReviewList lawyerId={id} />
          </section>
        </>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Detail />
    </Suspense>
  )
}
