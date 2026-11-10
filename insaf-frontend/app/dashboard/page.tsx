'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, pic } from '@/lib/supabase'

type Lawyer = { user_id: string; full_name: string; email: string; phone: string; specializations: string[]; picture_path: string }

export default function Home() {
  const [name, setName] = useState('')
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [appStatus, setAppStatus] = useState('')
  const [myId, setMyId] = useState('')

    useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) return
      setMyId(user.id)
      const [p, l, a] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('lawyer_directory').select('user_id, full_name, email, phone, specializations, picture_path'),
        supabase.from('lawyer_applications').select('status').eq('user_id', user.id).maybeSingle(),
      ])
      setName(p.data?.full_name || user.email || '')
      setLawyers(l.data ?? [])
      if (a.data) setAppStatus(a.data.status)
    })
  }, [])

  const me = lawyers.find(l => l.user_id === myId)   // this lawyer's own directory row

  return (
    <div>
      <h1>Welcome, {name}</h1>

      {/* Pending and approved lawyers don't see the other lawyers' list */}
      {appStatus === 'pending' && <p>Your lawyer application is pending review.</p>}
      {appStatus === 'approved' && (
        <>
          <p>You are an approved lawyer. <Link href="/lawyer/dashboard">Go to my lawyer profile</Link></p>
          {me && (
            <div className="card">
              {me.picture_path && <img src={pic(me.picture_path)} width={80} height={80} alt="" />}
              <p><b>{me.full_name}</b></p>
              <p>Phone: {me.phone}<br />Email: {me.email}</p>
            </div>
          )}
        </>
      )}

      {appStatus !== 'pending' && appStatus !== 'approved' && (
        <>
          {appStatus === 'rejected' && <p>Your lawyer application: <b>rejected</b></p>}
          <h2>Lawyers</h2>
          {lawyers.length === 0 && <p>No lawyers found.</p>}
          {lawyers.map(l => (
            <Link key={l.user_id} href={`/lawyer/${l.user_id}`} className="card">
              {l.picture_path && <img src={pic(l.picture_path)} width={50} height={50} alt="" />}
              <br /><b>{l.full_name}</b><br />{l.specializations.join(', ')}
            </Link>
          ))}
        </>
      )}
    </div>
  )
}

// 'use client'
// import { useEffect, useState } from 'react'
// import Link from 'next/link'
// import { supabase, pic } from '@/lib/supabase'

// export default function Home() {
//   const [name, setName] = useState('')
//   const [lawyers, setLawyers] = useState<any[]>([])
//   const [appStatus, setAppStatus] = useState('')

//   useEffect(() => {
//     supabase.auth.getSession().then(async ({ data }) => {
//       const user = data.session?.user
//       if (!user) return
//       const [p, l, a] = await Promise.all([
//         supabase.from('profiles').select('full_name').eq('id', user.id).single(),
//         supabase.from('lawyer_directory').select('user_id, full_name, specializations, picture_path'),
//         supabase.from('lawyer_applications').select('status').eq('user_id', user.id).maybeSingle(),
//       ])
//       setName(p.data?.full_name || user.email || '')
//       setLawyers(l.data ?? [])
//       if (a.data) setAppStatus(a.data.status)
//     })
//   }, [])

//   return (
//     <div>
//       <h1>Welcome, {name}</h1>
//       {appStatus && <p>Your lawyer application: <b>{appStatus}</b></p>}

//       <h2>Lawyers</h2>
//       {lawyers.length === 0 && <p>No lawyers found.</p>}
//       {lawyers.map(l => (
//         <Link key={l.user_id} href={`/lawyer/${l.user_id}`} className="card">
//           {l.picture_path && <img src={pic(l.picture_path)} width={50} height={50} alt="" />}
//           <br /><b>{l.full_name}</b><br />{l.specializations.join(', ')}
//         </Link>
//       ))}
//     </div>
//   )
// }
