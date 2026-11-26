'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function stars(rating: number) {
  const rounded = Math.round(rating)
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded)
}

// Average rating and all reviews of one lawyer.
// Used on the lawyer profile page and the Reviews tab of the lawyer dashboard.
export default function ReviewList({ lawyerId }: { lawyerId: string }) {
  const [reviews, setReviews] = useState<any[] | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('reviews').select('*').eq('lawyer_id', lawyerId).order('created_at', { ascending: false })
      .then(r => r.error ? setMsg(r.error.message) : setReviews(r.data))
  }, [lawyerId])

  if (msg) return <p className="ld-msg">{msg}</p>
  if (!reviews) return <p>Loading reviews...</p>
  if (!reviews.length) return <p className="ldb-empty">No reviews yet.</p>

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  return (
    <>
      <p className="rv-average">
        <span className="rv-stars">{stars(average)}</span> <b>{average.toFixed(1)}</b> out of 5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
      </p>
      {reviews.map(r => (
        <div key={r.id} className="rv-item">
          <span className="rv-stars">{stars(r.rating)}</span>
          <b>{r.reviewer_name || 'Client'}</b>
          <small>{new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}
    </>
  )
}
