'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, showDateTime } from '@/lib/supabase'
import AppointmentPopup from '../../AppointmentPopup'

// My appointments: every booking this user made, newest date first
export default function MyAppointments() {
  const [list, setList] = useState<any[] | null>(null)
  const [lawyerNames, setLawyerNames] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState<any>(null)   // appointment shown in the popup
  const [reviewed, setReviewed] = useState<number[]>([])   // ids of appointments this user already reviewed
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewMsg, setReviewMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const r = await supabase.from('appointments').select('*')
      .eq('user_id', data.user.id).order('appointment_at', { ascending: false })
    if (r.error) return setMsg(r.error.message)
    setList(r.data)

    const rv = await supabase.from('reviews').select('appointment_id').eq('user_id', data.user.id)
    setReviewed(rv.data?.map(x => x.appointment_id) ?? [])

    // appointments only keep the lawyer id, so get their names from the directory
    const ids = [...new Set(r.data.map(a => a.lawyer_id))]
    if (!ids.length) return
    const d = await supabase.from('lawyer_directory').select('user_id, full_name').in('user_id', ids)
    const names: Record<string, string> = {}
    d.data?.forEach(l => { names[l.user_id] = l.full_name })
    setLawyerNames(names)
  }

  useEffect(() => { load() }, [])

  function openPopup(a: any) {
    setOpen(a); setRating(0); setComment(''); setReviewMsg('')
  }

  // a review is allowed after the meeting: completed, or accepted and its time has passed
  const canReview = (a: any) => !reviewed.includes(a.id) &&
    (a.status === 'completed' || (a.status === 'accepted' && new Date(a.appointment_at) < new Date()))

  async function sendReview() {
    if (!rating) return setReviewMsg('Pick 1 to 5 stars.')
    setBusy(true)
    const r = await supabase.from('reviews').insert({
      appointment_id: open.id,
      user_id: open.user_id,
      lawyer_id: open.lawyer_id,
      rating,
      comment: comment.trim() || null,
    })
    setBusy(false)
    if (r.error?.code === '23505') return setReviewMsg('You already reviewed this appointment.')
    if (r.error) return setReviewMsg(r.error.message)
    setReviewed([...reviewed, open.id])
    setReviewMsg("Thank you. Your review is now on the lawyer's profile.")
  }

  async function cancel(id: number) {
    if (!confirm('Cancel this appointment?')) return
    const r = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id).select()
    if (r.error) return setMsg(r.error.message)
    if (!r.data?.length) return setMsg('Could not cancel. It may already be rejected or completed.')
    setOpen(null)
    load()
  }

  return (
    <div>
      <h1>My appointments</h1>
      <p>Requests you sent to lawyers. The lawyer accepts or rejects each one.</p>
      {msg && <p className="ld-msg">{msg}</p>}
      {!list && !msg && <p>Loading...</p>}
      {list?.length === 0 && (
        <p className="ldb-empty">No appointments yet. <Link href="/#lawyers">Find a lawyer</Link> and click Book appointment.</p>
      )}

      <div className="appt-list">
        {list?.map(a => (
          <div key={a.id} className="appt-row" onClick={() => openPopup(a)}>
            <div>
              {/* a lawyer missing from the directory was removed or blocked by the admin */}
              <b>{lawyerNames[a.lawyer_id] ? `Adv. ${lawyerNames[a.lawyer_id]}` : 'Lawyer no longer listed'}</b>
              <small>{showDateTime(a.appointment_at)} · {a.consultation_type}</small>
              <p>{a.reason}</p>
            </div>
            <div className="appt-side">
              <span className={`appt-status ${a.status}`}>{a.status}</span>
              {/* clicking the row opens the popup, where the review form is */}
              {canReview(a) && <button className="ghost">Rate lawyer</button>}
              {(a.status === 'pending' || a.status === 'accepted') && (
                <button className="ghost" onClick={e => { e.stopPropagation(); cancel(a.id) }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <AppointmentPopup appt={open} onClose={() => setOpen(null)}
          title={lawyerNames[open.lawyer_id] ? `Adv. ${lawyerNames[open.lawyer_id]}` : 'Lawyer no longer listed'}>
          {(open.status === 'pending' || open.status === 'accepted') && (
            <button className="danger" onClick={() => cancel(open.id)}>Cancel appointment</button>
          )}
          {canReview(open) && (
            <div className="rv-form">
              <p className="ld-label">Rate this lawyer</p>
              <div className="rv-pick">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={n <= rating ? 'on' : ''} aria-label={`${n} stars`} onClick={() => setRating(n)}>★</button>
                ))}
              </div>
              <textarea placeholder="Write a short review (optional)" maxLength={500} value={comment}
                onChange={e => setComment(e.target.value)} />
              <button onClick={sendReview} disabled={busy}>{busy ? 'Sending...' : 'Send review'}</button>
            </div>
          )}
          {reviewMsg && <p className={reviewMsg.startsWith('Thank you') ? 'ld-msg ok' : 'ld-msg'}>{reviewMsg}</p>}
        </AppointmentPopup>
      )}
    </div>
  )
}
