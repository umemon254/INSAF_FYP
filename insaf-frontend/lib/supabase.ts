import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const pic = (path: string) =>
  supabase.storage.from('lawyer-pictures').getPublicUrl(path).data.publicUrl

export const passwordError = (p: string) =>
  p.length < 8 ? 'Password must be at least 8 characters.'
  : !/[A-Z]/.test(p) ? 'Password needs at least 1 uppercase letter.'
  : !/[0-9]/.test(p) ? 'Password needs at least 1 number.'
  : !/[^A-Za-z0-9]/.test(p) ? 'Password needs at least 1 symbol (for example @ # $ !).'
  : ''

export const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

export const fmtCnic = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13)
  let o = d.slice(0, 5)
  if (d.length > 5) o += '-' + d.slice(5, 12)
  if (d.length > 12) o += '-' + d.slice(12)
  return o
}

export const cleanName = (v: string) => v.replace(/[^A-Za-z .'-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 50)

export const nameOk = (v: string) => /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(v.trim())


export async function logoutAndRedirect() {
  await supabase.auth.signOut().catch(() => {})
  sessionStorage.clear()                                   // also removes any email handed over from sign-up
  Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
  window.location.replace('/login')                        // full reload: all form state is gone
}