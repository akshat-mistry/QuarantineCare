import './globals.css'
import Link from 'next/link'
import { sb } from '@/lib/supabase'
export const metadata = { title: 'QuarantineCare' }
export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await sb(); const { data: { user } } = await s.auth.getUser()
  const { data: p } = user ? await s.from('profiles').select('full_name,role').eq('id', user.id).single() : { data: null }
  return (<html lang="en"><body>
    <header className="bg-brand-900 text-white px-6 py-3 flex items-center gap-6">
      <b className="tracking-tight text-lg">Quarantine<span className="text-teal-300">Care</span></b>
      {p && <><Link href="/dashboard">Dashboard</Link>{p.role !== 'patient' && <Link href="/patients">Patients</Link>}
      <span className="ml-auto text-sm opacity-80">{p.full_name} · {p.role.replace('_', ' ')}</span>
      <form action={async () => { 'use server'; await (await sb()).auth.signOut() }}><button className="text-sm underline">Sign out</button></form></>}
    </header><main className="max-w-6xl mx-auto p-6">{children}</main></body></html>)
}
