'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, pic } from '@/lib/supabase'

function Detail() {
  const { id } = useParams<{ id: string }>()
  const [l, setL] = useState<any>(null)

  useEffect(() => {
    supabase.from('lawyer_directory').select('*').eq('user_id', id).single()
      .then(r => setL(r.data))
  }, [id])

  if (!l) return <p>Loading...</p>
  return (
    <div>
      {l.picture_path && <img src={pic(l.picture_path)} width={150} alt="" />}
      <h1>{l.full_name}</h1>
      <p>Email: {l.email}</p>
      <p>Phone: {l.phone}</p>
      <p>Specializations: {l.specializations.join(', ')}</p>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<p>Loading...</p>}><Detail /></Suspense>
}