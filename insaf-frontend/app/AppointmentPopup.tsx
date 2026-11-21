'use client'
import { useEffect, useState } from 'react'
import { supabase, showDateTime } from '@/lib/supabase'

// Full details of one appointment in a box in the middle of the screen.
// Used on My appointments (user side) and the lawyer dashboard.
export default function AppointmentPopup({ appt, title, email, onClose, children }: {
  appt: any, title: string, email?: string, onClose: () => void, children?: React.ReactNode
}) {
  const [links, setLinks] = useState<string[]>([])
  const paths: string[] = appt.evidence_paths ?? []

  useEffect(() => {
    // evidence is private, so we make links that work for 10 minutes
    if (!appt.evidence_paths?.length) return
    supabase.storage.from('appointment-files').createSignedUrls(appt.evidence_paths, 600)
      .then(r => setLinks((r.data ?? []).map(x => x.signedUrl ?? '')))
  }, [appt.evidence_paths])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal appt-modal" onClick={e => e.stopPropagation()}>
        <div className="appt-modal-head">
          <h2>{title}</h2>
          <span className={`appt-status ${appt.status}`}>{appt.status}</span>
        </div>

        <div className="appt-details">
          <p><small>Date and time</small>{showDateTime(appt.appointment_at)}</p>
          <p><small>Consultation type</small>{appt.consultation_type}</p>
          <p><small>Case type</small>{appt.case_type || '-'}</p>
          {appt.city && <p><small>City</small>{appt.city}</p>}
          {appt.phone && <p><small>Client phone</small>{appt.phone}</p>}
          {email && <p><small>Email</small>{email}</p>}
          <p className="ld-full"><small>Reason</small>{appt.reason}</p>
          <div className="ld-full">
            <small>Evidence</small>
            {paths.length === 0 && 'No files uploaded.'}
            {paths.map((path, i) => (
              // show the file name without the "<user id>/<time>-" part
              <a key={path} href={links[i]} target="_blank" rel="noreferrer" className="appt-file">
                {path.split('/')[1].replace(/^\d+-/, '')}
              </a>
            ))}
          </div>
        </div>

        {children}
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
