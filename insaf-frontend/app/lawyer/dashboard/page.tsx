'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, pic } from '@/lib/supabase'

export default function LawyerDashboard() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/login')
      const r = await supabase.from('lawyer_directory').select('*')
        .eq('user_id', data.user.id).maybeSingle()
      if (!r.data) return router.push('/dashboard')
      setMe(r.data)
    })
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!me) return <p>Loading...</p>
  return (
    <div>
      <h1>Lawyer Dashboard</h1>
      {me.picture_path && <img src={pic(me.picture_path)} width={120} alt="" />}
      <h2>{me.full_name}</h2>
      <p>Email: {me.email}<br />Phone: {me.phone}</p>
      <p>Specializations: {me.specializations.join(', ')}</p>
      <p><i>Your profile is approved and visible to users.</i></p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}