'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase, showDateTime } from '@/lib/supabase'

const DAY = 24 * 60 * 60 * 1000

// Accepted appointments in the next 24 hours. These are the reminders.
// RLS only returns appointments where you are the user or the lawyer.
function upcomingAppointments() {
  const now = new Date()
  return supabase.from('appointments').select('id, user_id, appointment_at, consultation_type')
    .eq('status', 'accepted')
    .gte('appointment_at', now.toISOString())
    .lte('appointment_at', new Date(now.getTime() + DAY).toISOString())
    .order('appointment_at')
}

// The list: reminders on top, then the last 30 notifications.
// Used in the bell dropdown and on the Notifications page.
export function NotificationList({ onRead }: { onRead?: () => void }) {
  const [userId, setUserId] = useState('')
  const [items, setItems] = useState<any[] | null>(null)
  const [reminders, setReminders] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      const [n, r] = await Promise.all([
        supabase.from('notifications').select('*, appointments(appointment_at)')
          .order('created_at', { ascending: false }).limit(30),
        upcomingAppointments(),
      ])
      if (n.error) return setMsg(n.error.message)
      setItems(n.data)
      setReminders(r.data ?? [])
    })
  }, [])

  async function markRead(id: number) {
    const r = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (r.error) return setMsg(r.error.message)
    setItems(items!.map(n => n.id === id ? { ...n, is_read: true } : n))
    onRead?.()
  }

  async function markAllRead() {
    const r = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    if (r.error) return setMsg(r.error.message)
    setItems(items!.map(n => ({ ...n, is_read: true })))
    onRead?.()
  }

  if (msg) return <p className="ld-msg">{msg}</p>
  if (!items) return <p className="nt-empty">Loading...</p>

  const unread = items.filter(n => !n.is_read).length

  return (
    <div className="nt-list">
      {reminders.map(a => (
        <Link key={'r' + a.id} className="nt-item nt-reminder"
          href={a.user_id === userId ? '/dashboard/appointments' : '/lawyer/dashboard'}>
          <b>Reminder: {a.consultation_type} appointment</b>
          <small>{showDateTime(a.appointment_at)}</small>
        </Link>
      ))}

      {items.map(n => (
        <Link key={n.id} href={n.link || '#'} className={n.is_read ? 'nt-item' : 'nt-item nt-unread'}
          onClick={() => { if (!n.is_read) markRead(n.id) }}>
          <b>{n.message}</b>
          {n.appointments && <small>Appointment: {showDateTime(n.appointments.appointment_at)}</small>}
          <small>{showDateTime(n.created_at)}</small>
        </Link>
      ))}

      {!items.length && !reminders.length && <p className="nt-empty">No notifications yet.</p>}
      {unread > 0 && <button type="button" className="ghost nt-all" onClick={markAllRead}>Mark all as read</button>}
    </div>
  )
}

// The bell with a red count. The count is unread notifications plus today's reminders,
// and it refreshes every minute so new requests show up without reloading the page.
export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  async function loadCount() {
    const [n, r] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
      upcomingAppointments(),
    ])
    setCount((n.count ?? 0) + (r.data?.length ?? 0))
  }

  useEffect(() => {
    loadCount()
    const timer = setInterval(loadCount, 60 * 1000)

    // close the list when the user clicks outside it
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => { clearInterval(timer); document.removeEventListener('click', close) }
  }, [])

  return (
    <div className="nt-bell" ref={boxRef}>
      <button type="button" aria-label="Notifications" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && <span className="nt-count">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="nt-drop">
          <div className="nt-drop-head">
            <b>Notifications</b>
            <Link href="/dashboard/notifications">See all</Link>
          </div>
          <NotificationList onRead={loadCount} />
        </div>
      )}
    </div>
  )
}
