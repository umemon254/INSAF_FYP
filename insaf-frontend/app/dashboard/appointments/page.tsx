'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, showDateTime } from '@/lib/supabase'
import AppointmentPopup from '../../AppointmentPopup'

function ReviewForm({ appointment, onSubmitted }: { appointment: any, onSubmitted: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (busy) return
    setBusy(true); setMsg('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setBusy(false); return setMsg('Please log in again.') }
    const r = await supabase.from('reviews').insert({
      appointment_id: appointment.id,
      lawyer_id: appointment.lawyer_id,
      reviewer_id: auth.user.id,
      rating,
      comment: comment.trim() || null,
    })
    setBusy(false)
    if (r.error?.code === '23505') return setMsg('You have already reviewed this appointment.')
    if (r.error) return setMsg(r.error.message)
    setMsg('Review submitted. Thank you!')
    onSubmitted()
  }

  return (
    <div className="ld-card">
      <h3>Review this lawyer</h3>
      <label>Rating
        <select value={rating} onChange={e => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}
        </select>
      </label>
      <label>Comment (optional)
        <textarea maxLength={1000} value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Share your experience with this lawyer" />
      </label>
      {msg && <p className="ld-msg">{msg}</p>}
      <button onClick={submit} disabled={busy}>{busy ? 'Submitting...' : 'Submit review'}</button>
    </div>
  )
}

// My appointments: every booking this user made, newest date first
export default function MyAppointments() {
  const [list, setList] = useState<any[] | null>(null)
  const [lawyerNames, setLawyerNames] = useState<Record<string, string>>({})
  const [reviewed, setReviewed] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState<any>(null)

  async function load() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const r = await supabase.from('appointments').select('*')
      .eq('user_id', data.user.id).order('appointment_at', { ascending: false })
    if (r.error) return setMsg(r.error.message)
    setList(r.data)

    const ids = [...new Set(r.data.map(a => a.lawyer_id))]
    if (ids.length) {
      const d = await supabase.from('lawyer_directory').select('user_id, full_name').in('user_id', ids)
      const names: Record<string, string> = {}
      d.data?.forEach(l => { names[l.user_id] = l.full_name })
      setLawyerNames(names)
    }

    const reviews = await supabase.from('reviews').select('appointment_id').eq('reviewer_id', data.user.id)
    if (!reviews.error) setReviewed((reviews.data ?? []).map(x => x.appointment_id))
  }

  useEffect(() => { load() }, [])

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
      <p>Requests you sent to lawyers. An appointment is confirmed only when the lawyer accepts it.
        If the lawyer doesn&apos;t answer before the time passes, it expires.</p>
      {msg && <p className="ld-msg">{msg}</p>}
      {!list && !msg && <p>Loading...</p>}
      {list?.length === 0 && (
        <p className="ldb-empty">No appointments yet. <Link href="/#lawyers">Find a lawyer</Link> and click Book appointment.</p>
      )}

      <div className="appt-list">
        {list?.map(a => (
          <div key={a.id} className="appt-row" onClick={() => setOpen(a)}>
            <div>
              <b>{lawyerNames[a.lawyer_id] ? `Adv. ${lawyerNames[a.lawyer_id]}` : 'Lawyer no longer listed'}</b>
              <small>{showDateTime(a.appointment_at)} · {a.consultation_type}</small>
              <p>{a.reason}</p>
            </div>
            <div className="appt-side">
              <span className={`appt-status ${a.status}`}>{a.status}</span>
              {(a.status === 'pending' || a.status === 'accepted') && (
                <button className="ghost" onClick={e => { e.stopPropagation(); cancel(a.id) }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {list?.filter(a => a.status === 'completed' && !reviewed.includes(a.id)).map(a => (
        <ReviewForm key={a.id} appointment={a} onSubmitted={load} />
      ))}

      {open && (
        <AppointmentPopup appt={open} onClose={() => setOpen(null)}
          title={lawyerNames[open.lawyer_id] ? `Adv. ${lawyerNames[open.lawyer_id]}` : 'Lawyer no longer listed'}>
          {(open.status === 'pending' || open.status === 'accepted') && (
            <button className="danger" onClick={() => cancel(open.id)}>Cancel appointment</button>
          )}
        </AppointmentPopup>
      )}
    </div>
  )
}
