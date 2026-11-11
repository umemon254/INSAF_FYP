// questions and answers about what INSAF can do right now
const FAQS = [
  ['How do I find a lawyer?', 'Open the home page and go to "Areas of law". Pick a lawyer type or type in the search box, then click a lawyer to see their profile, phone and email.'],
  ['Are the lawyers verified?', 'Yes. A lawyer is listed only after our admin team checks their Bar Council details and CNIC.'],
  ['I am a lawyer. How do I join?', 'Click "Join as a lawyer", fill in your details and upload your documents. The admin reviews them and you get an email when you are approved or rejected.'],
  ['My lawyer application was rejected. What now?', 'The email tells you the reason. Fix the details and apply again from "Join as a lawyer".'],
  ['How do I change my name?', 'Email the admin from the email you signed up with. You can find the address in Settings and below.'],
  ['I forgot my password.', 'Click "Forgot password?" on the login page. We send a code to your email, then you can set a new password.'],
  ['Can I book an appointment or lodge a complaint?', 'Not yet. Appointments, complaints and the AI legal assistant are coming soon.'],
  ['Is INSAF legal advice?', 'No. INSAF gives general legal information. For your own case, please talk to a qualified lawyer.'],
  ['Is my data safe?', 'Your password is stored securely by Supabase. CNIC images are private and only the admin can open them.'],
]

export default function Help() {
  return (
    <div>
      <h1>Help</h1>
      <p>Find quick answers below, or contact us.</p>

      <h2>FAQs</h2>
      <div className="faq">
        {FAQS.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      <h2>Contact us</h2>
      <div className="contact-card">
        <div>
          <b>Email the INSAF team</b>
          <p>Write your name, the email you signed up with and your question.</p>
        </div>
        <a href="mailto:insaf.team3@gmail.com?subject=INSAF%20support" className="cp-btn">insaf.team3@gmail.com</a>
      </div>
    </div>
  )
}
