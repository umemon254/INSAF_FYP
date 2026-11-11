'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase, pic } from '@/lib/supabase'

function Detail() {
  const { id } = useParams<{ id: string }>()
  const [l, setL] = useState<any>(null)

  useEffect(() => {
    supabase.from('lawyer_directory').select('*').eq('user_id', id).single()
      .then(r => setL(r.data))
  }, [id])

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
            {/* booking is not built yet, so the button is disabled on purpose */}
            <div className="ld-actions">
              <button disabled>Book appointment</button>
              <span className="lp-soon">Coming soon</span>
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