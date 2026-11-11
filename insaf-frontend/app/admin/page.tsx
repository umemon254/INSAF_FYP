
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, pic, logoutAndRedirect } from '@/lib/supabase'

const apiBase = () =>
  window.location.hostname.endsWith('devtunnels.ms')
    ? `https://${window.location.hostname.replace('-3000.', '-8000.')}`
    : 'http://localhost:8000'



const items = [['dashboard', 'Dashboard'], ['pending', 'Lawyer Requests'], ['approved', 'Approved'],
               ['rejected', 'Rejected'], ['blocked', 'Blocked'], ['users', 'Users']]

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']
const STATUS_COLORS = [['pending', '#f0a030'], ['approved', '#2e9e5b'], ['rejected', '#d9534f'], ['blocked', '#78909c']]

export default function Admin() {
  const router = useRouter()
  const [apps, setApps] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tab, setTab] = useState('dashboard')
  const [view, setView] = useState<any>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<'' | 'remove' | 'block'>('')
  const [today, setToday] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const a = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!a.data) return router.push('/')

    const list = (await supabase.from('lawyer_applications').select('*').order('created_at', { ascending: false })).data ?? []
    for (const x of list) {
      if (x.cnic_path) x.cnic_url = (await supabase.storage.from('cnic-images').createSignedUrl(x.cnic_path, 600)).data?.signedUrl
    }
    const dir = (await supabase.from('lawyer_directory').select('user_id, phone, specializations, picture_path')).data ?? []
    for (const x of list) {
      const d = dir.find((r: any) => r.user_id === x.user_id)
      if (d) { x.phone = d.phone; x.specializations = d.specializations; x.picture_path = d.picture_path }
    }
    setApps(list)
    setUsers((await supabase.from('profiles').select('id, email, full_name')).data ?? [])
  }
  useEffect(() => {
    load()
    setToday(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  async function notify(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiBase()}/notify-lawyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
        body: JSON.stringify({ lawyer_id: id }),
      })
      return res.ok
    } catch (e) { console.error(e); return false }
  }

  async function decide(a: any, ok: boolean) {
    if (busy) return
    const reason = ok ? null : prompt('Reason for rejection?')
    if (!ok && !reason) return
    setBusy(true)
    const r = await supabase.from('lawyer_applications')
      .update({ status: ok ? 'approved' : 'rejected', rejection_reason: reason })
      .eq('user_id', a.user_id).eq('status', 'pending').select()
    if (r.error || !r.data?.length) {
      setBusy(false); setView(null)
      alert(r.error?.message ?? 'This application was already reviewed.')
      return load()
    }
    if (ok) {
      const d = await supabase.from('lawyer_directory').insert({
        user_id: a.user_id, full_name: a.full_name, email: a.email,
        phone: a.phone, specializations: a.specializations, picture_path: a.picture_path,
        qualification: a.qualification, license_level: a.license_level,
        experience_years: a.experience_years, services: a.services,
      })
      if (d.error) { setBusy(false); return alert(d.error.message) }
    } else {
      await supabase.from('lawyer_directory').delete().eq('user_id', a.user_id)
    }
    if (!(await notify(a.user_id))) alert('Saved, but the email could not be sent.')
    setBusy(false); setView(null)
    load()
  }

  async function resend(a: any) {
    alert((await notify(a.user_id)) ? 'Email sent.' : 'The email could not be sent.')
  }

    function done() { setBusy(false); setConfirm(''); setView(null); load() }

  async function block(a: any) {
    setBusy(true)
    const r = await supabase.from('lawyer_applications').update({ status: 'blocked' }).eq('user_id', a.user_id).select()
    if (r.error || !r.data?.length) { setBusy(false); return alert(r.error?.message ?? 'Not saved.') }
    await supabase.from('lawyer_directory').delete().eq('user_id', a.user_id)
    done()
  }

  async function unblock(a: any) {
    setBusy(true)
    const r = await supabase.from('lawyer_applications').update({ status: 'approved' }).eq('user_id', a.user_id).select()
    if (r.error || !r.data?.length) { setBusy(false); return alert(r.error?.message ?? 'Not saved.') }
    const d = await supabase.from('lawyer_directory').insert({
      user_id: a.user_id, full_name: a.full_name, email: a.email,
      phone: a.phone, specializations: a.specializations, picture_path: a.picture_path,
      qualification: a.qualification, license_level: a.license_level,
      experience_years: a.experience_years, services: a.services,
    })
    if (d.error) alert(d.error.message)
    done()
  }

  async function remove(a: any) {
    setBusy(true)
    const r = await supabase.from('lawyer_applications').delete().eq('user_id', a.user_id).select()
    if (r.error || !r.data?.length) { setBusy(false); return alert(r.error?.message ?? 'Not removed.') }
    await supabase.from('lawyer_directory').delete().eq('user_id', a.user_id)
    if (a.picture_path) await supabase.storage.from('lawyer-pictures').remove([a.picture_path])
    if (a.cnic_path) await supabase.storage.from('cnic-images').remove([a.cnic_path])
    done()
  }

  const count = (s: string) => apps.filter(a => a.status === s).length
  const isList = ['pending', 'approved', 'rejected', 'blocked'].includes(tab)
  const list = apps.filter(a => a.status === tab &&
    [a.full_name, a.email, a.bar_council_id].join(' ').toLowerCase().includes(q.toLowerCase()))

  // numbers for the statistics chart, bars are sized against the biggest one
  const chart: [string, number, string][] = [
    ['Total users', users.length, '#1a3d6d'],
    ['Approved lawyers', count('approved'), '#2e9e5b'],
    ['Pending requests', count('pending'), '#f0a030'],
  ]
  const chartMax = Math.max(...chart.map(c => c[1]), 1)

  // donut: each status gets a slice from where the last one ended, e.g. "#2e9e5b 20% 80%"
  let sliceStart = 0
  const slices = STATUS_COLORS.map(([status, color]) => {
    const end = sliceStart + (apps.length ? count(status) / apps.length * 100 : 0)
    const slice = `${color} ${sliceStart}% ${end}%`
    sliceStart = end
    return slice
  })
  const donut = apps.length ? `conic-gradient(${slices.join(', ')})` : '#eef2f9'

  // how many approved lawyers handle each specialization
  const approved = apps.filter(a => a.status === 'approved')
  const specCounts: [string, number][] = SPECS.map(s => [s, approved.filter(a => (a.specializations ?? []).includes(s)).length])
  const specMax = Math.max(...specCounts.map(c => c[1]), 1)

  return (
    <div className="shell">
      <nav className={menu ? 'side open' : 'side'}>
        <div className="side-top">
          <h3><img src="/insaf-logo.svg" alt="" />INSAF Admin</h3>
          <button type="button" className="menu-btn" aria-label="Menu" onClick={() => setMenu(!menu)} />
        </div>
        <div className="side-links">
          {items.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMenu(false) }}>
              {label}
              {k === 'pending' && count('pending') > 0 && <span className="badge pending" style={{ marginLeft: 8 }}>{count('pending')}</span>}
            </button>
          ))}
          <span className="spacer" />
          <button onClick={logoutAndRedirect}>Logout</button>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <h1>{items.find(i => i[0] === tab)?.[1]}</h1>
          {isList && <input className="search" placeholder="Search name, email or Bar ID" value={q} onChange={e => setQ(e.target.value)} />}
        </div>

        {tab === 'dashboard' && (
          <div className="hero admin-hero">
            <div>
              <h2>Welcome, Admin</h2>
              <p>{count('pending') > 0
                ? `You have ${count('pending')} lawyer request${count('pending') > 1 ? 's' : ''} waiting.`
                : 'No lawyer requests are waiting right now.'}</p>
              <small>{today}</small>
            </div>
            <button onClick={() => setTab('pending')}>Review requests</button>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="stats">
            <div className="stat s1"><b>{count('pending')}</b>Pending requests</div>
            <div className="stat s2"><b>{count('approved')}</b>Approved lawyers</div>
            <div className="stat s3"><b>{count('rejected')}</b>Rejected</div>
            <div className="stat s4"><b>{users.length}</b>Total users</div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="chart stats-chart">
            <h3>Statistics</h3>
            {chart.map(([label, value, color]) => (
              <div key={label} className="bar-row">
                <span>{label}</span>
                <div className="bar"><div style={{ width: `${value / chartMax * 100}%`, background: color }} /></div>
                <b>{value}</b>
              </div>
            ))}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="dash-grid">
            <div className="chart">
              <h3>Applications by status</h3>
              <div className="donut">
                <div className="ring" style={{ background: donut }}>
                  <span><b>{apps.length}</b>applications</span>
                </div>
                <div>
                  {STATUS_COLORS.map(([status, color]) => (
                    <p key={status} className="legend"><i style={{ background: color }} />{status}: {count(status)}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="chart">
              <h3>Lawyers by specialization</h3>
              {specCounts.map(([spec, n]) => (
                <div key={spec} className="bar-row">
                  <span>{spec}</span>
                  <div className="bar"><div style={{ width: `${n / specMax * 100}%`, background: '#3b6cb7' }} /></div>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="chart recent">
            <h3>Recent applications</h3>
            {apps.length === 0 && <p>No applications yet.</p>}
            {apps.slice(0, 5).map(a => (
              <div key={a.user_id} className="row">
                {a.picture_path ? <img src={pic(a.picture_path)} alt="" /> : <div className="avatar">{a.full_name?.[0]}</div>}
                <div className="grow">
                  <b>{a.full_name}</b> <span className={`badge ${a.status}`}>{a.status}</span><br />
                  {(a.specializations ?? []).join(', ')}
                </div>
                <button onClick={() => setView(a)}>View</button>
              </div>
            ))}
          </div>
        )}

        {isList && list.length === 0 && <p>Nothing here.</p>}
        {isList && list.map(a => (
          <div key={a.user_id} className="row">
            {a.picture_path ? <img src={pic(a.picture_path)} alt="" /> : <div className="avatar">{a.full_name?.[0]}</div>}
            <div className="grow">
              <b>{a.full_name}</b> <span className={`badge ${a.status}`}>{a.status}</span><br />
              {a.email}<br />
              {a.province ? `${a.province} · ` : ''}{a.bar_council_id} · {(a.specializations ?? []).join(', ')}
            </div>
            <button onClick={() => setView(a)}>View</button>
          </div>
        ))}

        {tab === 'users' && users.map(u => (
          <div key={u.id} className="row">
            <div className="grow"><b>{u.full_name || '-'}</b><br />{u.email}</div>
          </div>
        ))}
      </div>

      {view && (
        <div className="modal-bg" onClick={() => setView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{view.full_name}</h2>
            <div className="panels">
              <div className="panel">
                <h3>Lawyer Information</h3>
                {view.picture_path && <img src={pic(view.picture_path)} width={80} alt="" />}
                <p>Province: {view.province || '-'}<br />
                  Bar Council ID: {view.bar_council_id}<br />
                  Specializations: {(view.specializations ?? []).join(', ')}<br />
                  Qualification: {view.qualification || '-'}<br />
                  Licence: {view.license_level || '-'}<br />
                  Experience: {view.experience_years ?? '-'} years<br />
                  Services: {view.services || '-'}</p>
              </div>
              <div className="panel">
                <h3>Contact and Identity</h3>
                <p>Email: {view.email}<br />
                  Phone: {view.phone}<br />
                  CNIC: {view.cnic}<br />
                  {view.cnic_url && <a href={view.cnic_url} target="_blank" rel="noreferrer">Open CNIC PDF</a>}</p>
              </div>
            </div>
                        {confirm ? (
              <div className="confirm">
                <p><b>{confirm === 'remove' ? 'Remove this lawyer permanently?' : 'Block this lawyer?'}</b></p>
                <div className="row" style={{ margin: 0, boxShadow: 'none' }}>
                  {view.picture_path ? <img src={pic(view.picture_path)} alt="" /> : <div className="avatar">{view.full_name?.[0]}</div>}
                  <div className="grow"><b>{view.full_name}</b><br />{view.phone}<br />{view.email}</div>
                </div>
                <p>{confirm === 'remove'
                  ? 'Their application, directory entry, photo and CNIC file will be deleted. They can apply again later.'
                  : 'They will be hidden from the directory and cannot apply again until you unblock them.'}</p>
                <button className="danger" disabled={busy}
                  onClick={() => (confirm === 'remove' ? remove(view) : block(view))}>Yes, {confirm}</button>
                <button className="ghost" onClick={() => setConfirm('')}>Cancel</button>
              </div>
            ) : view.status === 'pending' ? (
              <>
                <button onClick={() => decide(view, true)} disabled={busy}>Approve</button>
                <button onClick={() => decide(view, false)} disabled={busy}>Reject</button>
              </>
            ) : (
              <>
                {view.status !== 'blocked' && <button onClick={() => resend(view)}>Resend email</button>}
                {view.status === 'approved' && <button className="ghost" onClick={() => setConfirm('block')}>Block</button>}
                {view.status === 'blocked' && <button onClick={() => unblock(view)} disabled={busy}>Unblock</button>}
                <button className="danger" onClick={() => setConfirm('remove')}>Remove</button>
              </>
            )}
            <button className="ghost" onClick={() => { setConfirm(''); setView(null) }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}