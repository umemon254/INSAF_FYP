'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, pic } from '@/lib/supabase'

export default function Admin() {
  const router = useRouter()
  const [apps, setApps] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const a = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!a.data) return router.push('/dashboard')
    const list = (await supabase.from('lawyer_applications').select('*').order('created_at', { ascending: false })).data ?? []
    for (const x of list)
      if (x.cnic_path) x.cnic_url = (await supabase.storage.from('cnic-images').createSignedUrl(x.cnic_path, 600)).data?.signedUrl
    setApps(list)
    setUsers((await supabase.from('profiles').select('id, email')).data ?? [])
  }
  useEffect(() => { load() }, [])

  async function decide(a: any, ok: boolean) {
    const reason = ok ? null : prompt('Reason for rejection?')
    if (!ok && !reason) return
    const r = await supabase.from('lawyer_applications')
      .update({ status: ok ? 'approved' : 'rejected', rejection_reason: reason }).eq('user_id', a.user_id)
    if (r.error) return alert(r.error.message)
    if (ok) {
      const d = await supabase.from('lawyer_directory').insert({
        user_id: a.user_id, full_name: a.full_name, email: a.email,
        phone: a.phone, specializations: a.specializations, picture_path: a.picture_path,
      })
      if (d.error) return alert(d.error.message)
    }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('http://localhost:8000/notify-lawyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
      body: JSON.stringify({ lawyer_id: a.user_id }),
    })
    if (!res.ok) alert('Saved, but the email failed.')
    load()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pending = apps.filter(a => a.status === 'pending')
  const reviewed = apps.filter(a => a.status !== 'pending')

  const card = (a: any) => (
    <div key={a.user_id} className="card">
      {a.picture_path && <img src={pic(a.picture_path)} width={80} alt="" />}
      <p><b>{a.full_name}</b> ({a.email}), <i>{a.status}</i></p>
      <p>Phone: {a.phone}<br />Bar ID: {a.bar_council_id}</p>
      {a.cnic_url && <a href={a.cnic_url} target="_blank">Open CNIC PDF</a>}
      <p>{a.specializations.join(', ')}</p>
      {a.status === 'pending' && (
        <>
          <button onClick={() => decide(a, true)}>Approve</button>
          <button onClick={() => decide(a, false)}>Reject</button>
        </>
      )}
    </div>
  )

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>{users.length} users, {pending.length} pending applications</p>

      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 && <p>No pending applications.</p>}
      {pending.map(card)}

      <h2>Reviewed ({reviewed.length})</h2>
      {reviewed.map(card)}

      <h2>All users</h2>
      {users.map(u => <p key={u.id}>{u.email}</p>)}

      <button onClick={logout}>Logout</button>
    </div>
  )
}