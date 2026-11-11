const FEATURES = [
  ['Verified lawyers directory', 'Find lawyers by area of law. Every lawyer is checked by our admin team before they are listed.', ''],
  ['Lawyer dashboard', 'Approved lawyers manage their own profile, specializations and services.', ''],
  ['AI legal assistant', 'Ask a legal question in simple words and get an answer from Pakistani law, with sources.', 'Coming soon'],
  ['Complaints and evidence', 'Lodge a complaint, upload evidence and track it with a Complaint ID.', 'Coming soon'],
]

export default function About() {
  return (
    <div>
      <div className="about-hero">
        <img src="/insaf-logo.svg" alt="INSAF logo" />
        <div>
          <h1>About INSAF</h1>
          <p>Legal information and verified lawyers, in one place.</p>
        </div>
      </div>

      <h2>Our mission</h2>
      <p>Many people in Pakistan don&apos;t know their legal rights or where to start when they have a legal problem.
        INSAF explains the law in simple words and connects citizens with lawyers checked by our admin team.</p>

      <h2>What INSAF offers</h2>
      <div className="about-grid">
        {FEATURES.map(([title, text, soon]) => (
          <div key={title} className="about-card">
            <b>{title}</b>
            <p>{text}</p>
            {soon && <span className="lp-soon">{soon}</span>}
          </div>
        ))}
      </div>

      <h2>How we keep it safe</h2>
      <ul>
        <li>Lawyers are listed only after the admin checks their Bar Council ID and CNIC.</li>
        <li>CNIC images are private. Only the admin can open them.</li>
        <li>Database rules make sure each person can only see and change what belongs to them.</li>
      </ul>

      <h2>Built with</h2>
      <p>Next.js and TypeScript for the website, Supabase for login, database and file storage, and Python (FastAPI) for the backend.</p>

      <p className="about-note">INSAF does not replace lawyers, courts, police or government offices. It gives general legal information, not legal advice.</p>
      <p className="about-note">INSAF is a Final Year Project for the BS Computer Science degree at SZABIST University, Karachi.</p>
    </div>
  )
}
