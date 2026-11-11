'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, onlyDigits, fmtCnic, cleanName, nameOk, QUALIFICATIONS, LICENSE_LEVELS, splitChoice } from '@/lib/supabase'

const SPECS = ['Criminal', 'Family', 'Property', 'Cybercrime', 'Corporate']
const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad', 'Gilgit-Baltistan']

export default function Apply() {
  const [f, setF] = useState({
    full_name: '', phone: '', cnic: '', province: '', bar_council_id: '',
    experience_years: '', services: '',
  })
  const [qual, setQual] = useState('')
  const [qualOther, setQualOther] = useState('')
  const [license, setLicense] = useState('')
  const [licenseOther, setLicenseOther] = useState('')
  const [specs, setSpecs] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [cnicFile, setCnicFile] = useState<File | null>(null)
  const [app, setApp] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.replace('/login?next=lawyer'); return }
      const r = await supabase.from('lawyer_applications').select('*').eq('user_id', data.user.id).maybeSingle()
      if (r.data) {
        setApp(r.data)
        setF({
          full_name: r.data.full_name,
          phone: r.data.phone,
          cnic: r.data.cnic ?? '',
          province: r.data.province ?? '',
          bar_council_id: r.data.bar_council_id,
          experience_years: r.data.experience_years?.toString() ?? '',
          services: r.data.services ?? '',
        })
        setSpecs(r.data.specializations)
        const [q, qo] = splitChoice(r.data.qualification, QUALIFICATIONS)
        setQual(q); setQualOther(qo)
        const [l, lo] = splitChoice(r.data.license_level, LICENSE_LEVELS)
        setLicense(l); setLicenseOther(lo)
      }
      setReady(true)   // show the form only after we know if the user already applied
    })
  }, [])

  const status = app?.status ?? ''
  const editing = status === 'pending'

  async function submit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !f.full_name || !f.bar_council_id || !specs.length || (!editing && (!photo || !cnicFile)))
      return setMsg('Fill all fields, pick a specialization, and add the picture and CNIC PDF.')
    if (!nameOk(f.full_name)) return setMsg('Name can have letters and spaces only (at least 2 letters).')
    if (!/^\d{11}$/.test(f.phone)) return setMsg('Phone number must be exactly 11 digits, for example 03001234567.')
    if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) return setMsg('CNIC must look like 12345-1234567-1.')
    if (!f.province) return setMsg('Select the Bar Council that issued your licence.')
    if (!/^[A-Z0-9/-]{3,20}$/.test(f.bar_council_id))
      return setMsg('Bar Council ID can have letters, numbers, - and / only (3 to 20 characters).')
    const qualification = qual === 'Other' ? qualOther.trim() : qual
    const license_level = license === 'Other' ? licenseOther.trim() : license
    if (!qual) return setMsg('Select your educational qualification.')
    if (qualification.length < 2) return setMsg('Please specify your educational qualification.')
    if (!license) return setMsg('Select your professional licensing status.')
    if (license_level.length < 2) return setMsg('Please specify your professional licensing status.')
    if (f.experience_years === '' || Number(f.experience_years) > 60) return setMsg('Experience must be between 0 and 60 years.')
    if (f.services.trim().length < 3) return setMsg('Enter the services you offer.')

    const row: any = {
      ...f, email: user.email, specializations: specs,
      qualification, license_level, services: f.services.trim(),
      experience_years: Number(f.experience_years),
    }
    if (photo) {
      const p = `${user.id}/${Date.now()}-pic`
      const up = await supabase.storage.from('lawyer-pictures').upload(p, photo)
      if (up.error) return setMsg(up.error.message)
      row.picture_path = p
    }
    if (cnicFile) {
      const p = `${user.id}/${Date.now()}-cnic`
      const up = await supabase.storage.from('cnic-images').upload(p, cnicFile)
      if (up.error) return setMsg(up.error.message)
      row.cnic_path = p
    }

    const { error } = status
      ? await supabase.from('lawyer_applications').update({ ...row, status: 'pending', rejection_reason: null }).eq('user_id', user.id)
      : await supabase.from('lawyer_applications').insert({ ...row, user_id: user.id })
    if (error) return setMsg(error.message)
    setApp({ ...app, ...row, status: 'pending' })
    setPhoto(null); setCnicFile(null)
    setMsg(editing ? 'Application updated.' : 'Application sent.')
  }

  if (!ready) return <div><p>Loading...</p></div>
  if (status === 'blocked')
    return (
      <div>
        <div className="titlebar">
          <Link href="/" className="back" aria-label="Back to home">←</Link>
          <h2>Your lawyer account is blocked.</h2>
        </div>
        <p>Please contact the INSAF admin for more information.</p>
      </div>
    )

  if (status === 'approved')
    return (
      <div>
        <div className="titlebar">
          <Link href="/" className="back" aria-label="Back to home">←</Link>
          <h2>Your application is approved.</h2>
        </div>
        <p>You can update your phone, specializations and picture on your <Link href="/lawyer/dashboard">lawyer dashboard</Link>.</p>
      </div>
    )

  return (
    <div className="ld">
      <div className="titlebar">
        <Link href="/" className="back" aria-label="Back to home">←</Link>
        <h1>{editing ? 'Your Application' : 'Lawyer Registration'}</h1>
      </div>

      <section className="ld-banner reg-banner">
        <img src="/insaf-logo.svg" alt="" />
        <div>
          <h2>Join INSAF as a verified lawyer</h2>
          <p>Fill in your details. Our admin team checks your Bar Council licence, then you are listed for clients.</p>
        </div>
      </section>
      {editing && <p className="ld-note">Status: <b>pending</b>. You can still fix your details until the admin reviews them.</p>}
      {status === 'rejected' && (
        <p className="ld-msg"><b>Your previous application was rejected.</b><br />Reason: {app.rejection_reason}<br />Fix the details and apply again.</p>
      )}

      <section className="ld-card reg-card">
        <h2>1. Personal details</h2>
        <div className="ld-grid">
          <label className="ld-full">Full name
            <input placeholder="As on your CNIC" value={f.full_name} onChange={e => setF({ ...f, full_name: cleanName(e.target.value) })} />
          </label>
          <label>Phone number
            <input placeholder="03001234567" inputMode="numeric" maxLength={11} value={f.phone}
              onChange={e => setF({ ...f, phone: onlyDigits(e.target.value, 11) })} />
          </label>
          <label>CNIC number
            <input placeholder="12345-1234567-1" inputMode="numeric" maxLength={15} value={f.cnic}
              onChange={e => setF({ ...f, cnic: fmtCnic(e.target.value) })} />
          </label>
        </div>

        <h2>2. Licence and experience</h2>
        <div className="ld-grid">
          <label>Bar Council (province)
            <select value={f.province} onChange={e => setF({ ...f, province: e.target.value })}>
              <option value="">Select province</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>Bar Council ID
            <input placeholder="As on your licence" value={f.bar_council_id}
              onChange={e => setF({ ...f, bar_council_id: e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 20) })} />
          </label>
          <label>Educational qualification
            <select value={qual} onChange={e => setQual(e.target.value)}>
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            {qual === 'Other' && (
              <input placeholder="Please specify your educational qualification" maxLength={100} value={qualOther}
                onChange={e => setQualOther(e.target.value)} />
            )}
          </label>
          <label>Professional licensing status
            <select value={license} onChange={e => setLicense(e.target.value)}>
              <option value="">Select licensing status</option>
              {LICENSE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {license === 'Other' && (
              <input placeholder="Please specify your professional licensing status" maxLength={100} value={licenseOther}
                onChange={e => setLicenseOther(e.target.value)} />
            )}
          </label>
          <label>Years of experience
            <input placeholder="For example 5" inputMode="numeric" maxLength={2} value={f.experience_years}
              onChange={e => setF({ ...f, experience_years: onlyDigits(e.target.value, 2) })} />
          </label>
          <label>Services
            <input placeholder="Bail cases, divorce, property transfer" maxLength={300} value={f.services}
              onChange={e => setF({ ...f, services: e.target.value })} />
          </label>
        </div>

        <h2>3. Specializations</h2>
        <div className="ld-chips">
          {SPECS.map(s => (
            <label key={s}>
              <input type="checkbox" checked={specs.includes(s)}
                onChange={e => setSpecs(e.target.checked ? [...specs, s] : specs.filter(x => x !== s))} />{s}
            </label>
          ))}
        </div>

        <h2>4. Documents</h2>
        <div className="ld-grid">
          <label>Profile picture{editing && ' (leave empty to keep the current one)'}
            <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          <label>CNIC (PDF file){editing && ' (leave empty to keep the current one)'}
            <input type="file" accept="application/pdf" onChange={e => setCnicFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {msg && <p className={msg.startsWith('Application') ? 'ld-msg ok' : 'ld-msg'}>{msg}</p>}
        <div className="ld-actions">
          <button onClick={submit}>{editing ? 'Update application' : status === 'rejected' ? 'Apply again' : 'Submit for approval'}</button>
        </div>
      </section>
    </div>
  )
}
