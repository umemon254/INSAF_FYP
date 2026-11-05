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
    <div>
      <div className="titlebar">
        <Link href="/dashboard" className="back" aria-label="Back to dashboard">🡨</Link>
        <h1>{l ? l.full_name : 'Loading...'}</h1>
      </div>
      {l && (
        <>
          {l.picture_path && <img src={pic(l.picture_path)} width={150} alt="" />}
          <p>Email: {l.email}</p>
          <p>Phone: {l.phone}</p>
          <p>Specializations: {l.specializations.join(', ')}</p>
        </>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<p>Loading...</p>}><Detail /></Suspense>
}