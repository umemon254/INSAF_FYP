'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, pic, onlyDigits, logoutAndRedirect, QUALIFICATIONS, LICENSE_LEVELS, splitChoice } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']

// sidebar items that are not built yet, they show a "Soon" tag
const SOON_ITEMS = ['My Clients', 'My Cases', 'Messages', 'Video Consultations', 'AI Legal Assistant', 'Documents', 'Reviews']

// numbers from the reference dashboard that need tables we don't have yet
const SOON_STATS = ['Total appointments', 'Upcoming appointments', 'Active cases', 'Total clients']

// appointment actions we plan to add. Shown disabled until booking is built.
const APPOINTMENT_ACTIONS = ['Accept', 'Reject', 'Reschedule', 'Cancel', 'Mark as completed', 'View client details']

export default function LawyerDashboard() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [qual, setQual] = useState('')
  const [qualOther, setQualOther] = useState('')
  const [license, setLicense] = useState('')
  const [licenseOther, setLicenseOther] = useState('')
  const [experience, setExperience] = useState('')
  const [services, setServices] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('dashboard')   // 'dashboard', 'appointments' or 'profile'
  const [menu, setMenu] = useState(false)       // sidebar open on phones

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/login')
      const r = await supabase.from('lawyer_directory').select('*').eq('user_id', data.user.id).maybeSingle()
      if (!r.data) return router.push('/')
      setMe(r.data); setPhone(r.data.phone); setSpecs(r.data.specializations)
      const [q, qo] = splitChoice(r.data.qualification, QUALIFICATIONS)
      setQual(q); setQualOther(qo)
      const [l, lo] = splitChoice(r.data.license_level, LICENSE_LEVELS)
      setLicense(l); setLicenseOther(lo)
      setExperience(r.data.experience_years?.toString() ?? '')
      setServices(r.data.services ?? '')
    })
  }, [router])

  async function save() {
    if (!/^\d{11}$/.test(phone)) return setMsg('Phone number must be exactly 11 digits.')
    if (!specs.length) return setMsg('Pick at least one specialization.')
    const qualification = qual === 'Other' ? qualOther.trim() : qual
    const license_level = license === 'Other' ? licenseOther.trim() : license
    if (!qual) return setMsg('Select your educational qualification.')
    if (qualification.length < 2) return setMsg('Please specify your educational qualification.')
    if (!license) return setMsg('Select your professional licensing status.')
    if (license_level.length < 2) return setMsg('Please specify your professional licensing status.')
    if (experience === '' || Number(experience) > 60) return setMsg('Experience must be between 0 and 60 years.')
    if (services.trim().length < 3) return setMsg('Enter the services you offer.')
    const row: any = {
      phone, specializations: specs,
      qualification, license_level, experience_years: Number(experience), services: services.trim(),
    }
    if (photo) {
      const p = `${me.user_id}/${Date.now()}-pic`
      const up = await supabase.storage.from('lawyer-pictures').upload(p, photo)
      if (up.error) return setMsg(up.error.message)
      row.picture_path = p
    }
    const r = await supabase.from('lawyer_directory').update(row).eq('user_id', me.user_id).select()
    if (r.error) return setMsg(r.error.message)
    if (!r.data?.length) return setMsg('Not saved: permission missing. Run the SQL rules first.')
    setMe({ ...me, ...row }); setPhoto(null); setMsg('Saved.')
  }

  if (!me) return <p>Loading...</p>
  return (
    <div className="shell">
      <nav className={menu ? 'side lawyer-side open' : 'side lawyer-side'}>
        <div className="side-top">
          <h3><img src="/insaf-logo.svg" alt="" />INSAF<small>Lawyer Portal</small></h3>
          <button type="button" className="menu-btn" aria-label="Menu" onClick={() => setMenu(!menu)} />
        </div>
        <div className="side-links">
          <button className={tab === 'dashboard' ? 'on' : ''} onClick={() => { setTab('dashboard'); setMenu(false) }}>Dashboard</button>
          <button className={tab === 'appointments' ? 'on' : ''} onClick={() => { setTab('appointments'); setMenu(false) }}>Appointments</button>
          {SOON_ITEMS.map(item => (
            <button key={item} disabled className="side-soon">{item} <span className="lp-soon">Soon</span></button>
          ))}
          <button className={tab === 'profile' ? 'on' : ''} onClick={() => { setTab('profile'); setMenu(false) }}>My Profile</button>
          <Link href="/dashboard/settings">Settings</Link>
          <span className="spacer" />
          <button onClick={logoutAndRedirect}>Logout</button>
        </div>
      </nav>

      <div className="main">
        {tab === 'dashboard' && (
          <>
            <div className="ldb-head">
              <div>
                <h1>Welcome back, Adv. {me.full_name}</h1>
                <p>Here is your practice overview for today.</p>
              </div>
              <div className="ldb-head-right">
                <button className="ghost" disabled>Notifications <span className="lp-soon">Soon</span></button>
                {me.picture_path
                  ? <img src={pic(me.picture_path)} alt="" className="ldb-avatar" />
                  : <span className="avatar ldb-avatar">{me.full_name[0]}</span>}
              </div>
            </div>

            <div className="ldb-stats">
              {/* real numbers from your lawyer_directory row */}
              <div className="stat"><small>Profile status</small><b>Verified</b>Approved by admin</div>
              <div className="stat"><small>Experience</small><b>{me.experience_years ?? 0}</b>Years</div>
              <div className="stat"><small>Specializations</small><b>{me.specializations.length}</b>Areas of law</div>
              <div className="stat"><small>Licence</small><b className="ldb-small">{me.license_level || '-'}</b></div>
              {SOON_STATS.map(label => (
                <div key={label} className="stat ldb-soon"><small>{label}</small><b>-</b><span className="lp-soon">Coming soon</span></div>
              ))}
            </div>

            <div className="ldb-grid">
              <div>
                <section className="ld-card ldb-panel">
                  <h3>Today&apos;s Appointments</h3>
                  <p className="ldb-empty">Coming soon. Booking is not built yet.</p>
                </section>
                <section className="ld-card ldb-panel">
                  <h3>Pending Appointment Requests</h3>
                  <p className="ldb-empty">Coming soon. Requests from users will show here.</p>
                </section>
              </div>
              <div>
                <section className="ld-card ldb-panel">
                  <h3>My Profile</h3>
                  <p><b>{me.full_name}</b><br />{me.email}<br />{me.phone}</p>
                  <div className="ld-tags ldb-tags">
                    {me.specializations.map((s: string) => <span key={s}>{s}</span>)}
                  </div>
                  <button className="ldb-btn" onClick={() => setTab('profile')}>Edit profile</button>
                </section>
                <section className="ld-card ldb-panel">
                  <h3>Recent Clients</h3>
                  <p className="ldb-empty">Coming soon.</p>
                </section>
              </div>
            </div>
          </>
        )}

        {tab === 'appointments' && (
          <>
            <h1>Appointments <span className="lp-soon">Coming soon</span></h1>
            <section className="ld-card">
              <p>Booking is not built yet. When it is, you will manage your appointments here.</p>
              <div className="ap-actions">
                {APPOINTMENT_ACTIONS.map(action => <button key={action} disabled>{action}</button>)}
              </div>
              <label className="ap-type">Consultation type
                <select disabled>
                  <option>In-person</option>
                  <option>Chat</option>
                  <option>Video Call</option>
                </select>
              </label>
            </section>
          </>
        )}

        {tab === 'profile' && (
          <>
            <h1>My Profile</h1>
            <p className="ld-note">Name, email and Bar Council ID cannot be changed here. Email the admin for a correction.</p>
          <section className="ld-card">
            <h2>Update your profile</h2>
            <div className="ld-grid">
              <label>Phone number
                <input placeholder="03001234567" inputMode="numeric" maxLength={11} value={phone}
                  onChange={e => setPhone(onlyDigits(e.target.value, 11))} />
              </label>
              <label>Years of experience
                <input placeholder="Years of experience" inputMode="numeric" maxLength={2} value={experience}
                  onChange={e => setExperience(onlyDigits(e.target.value, 2))} />
              </label>
              <label>Educational qualification
                <select value={qual} onChange={e => setQual(e.target.value)}>
                  <option value="">Educational qualification</option>
                  {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                {qual === 'Other' && (
                  <input placeholder="Please specify your educational qualification" maxLength={100} value={qualOther}
                    onChange={e => setQualOther(e.target.value)} />
                )}
              </label>
              <label>Professional licensing status
                <select value={license} onChange={e => setLicense(e.target.value)}>
                  <option value="">Professional licensing status</option>
                  {LICENSE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {license === 'Other' && (
                  <input placeholder="Please specify your professional licensing status" maxLength={100} value={licenseOther}
                    onChange={e => setLicenseOther(e.target.value)} />
                )}
              </label>
              <label className="ld-full">Services
                <input placeholder="For example bail cases, divorce, property transfer" maxLength={300} value={services}
                  onChange={e => setServices(e.target.value)} />
              </label>
              <label className="ld-full">New profile picture (optional)
                <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <p className="ld-label">Specializations</p>
            <div className="ld-chips">
              {SPECS.map(s => (
                <label key={s}>
                  <input type="checkbox" checked={specs.includes(s)}
                    onChange={e => setSpecs(e.target.checked ? [...specs, s] : specs.filter(x => x !== s))} />{s}
                </label>
              ))}
            </div>

            {msg && <p className={msg === 'Saved.' ? 'ld-msg ok' : 'ld-msg'}>{msg}</p>}
            <div className="ld-actions">
              <button onClick={save}>Save changes</button>
            </div>
          </section>
          </>
        )}
      </div>
    </div>
  )
}
