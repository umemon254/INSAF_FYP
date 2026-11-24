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

  async function load() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const r = await supabase.from('appointments').select('*')
      .eq('user_id', data.user.id).order('appointment_at', { ascending: false })
    if (r.error) return setMsg(r.error.message)
    setList(r.data)

    // appointments only keep the lawyer id, so get their names from the directory
    const ids = [...new Set(r.data.map(a => a.lawyer_id))]
    if (!ids.length) return
    const d = await supabase.from('lawyer_directory').select('user_id, full_name').in('user_id', ids)
    const names: Record<string, string> = {}
    d.data?.forEach(l => { names[l.user_id] = l.full_name })
    setLawyerNames(names)
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
              {/* a lawyer missing from the directory was removed or blocked by the admin */}
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
