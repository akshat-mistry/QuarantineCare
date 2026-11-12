'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
export default function Login() {
  const [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  async function go(ev: React.FormEvent) {
    ev.preventDefault(); setBusy(true); setErr('')
    const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await s.auth.signInWithPassword({ email: e, password: p })
    if (error) { setErr(error.message); setBusy(false) } else window.location.href = '/dashboard'
  }
  return (<form onSubmit={go} className="card max-w-sm mx-auto mt-24 space-y-3">
    <h1 className="text-xl font-semibold">Sign in to QuarantineCare</h1>
    <input className="inp" placeholder="Email" value={e} onChange={x => setE(x.target.value)} />
    <input className="inp" type="password" placeholder="Password" value={p} onChange={x => setP(x.target.value)} />
    {err && <p className="text-sm text-red-600">{err}</p>}
    <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>)
}
