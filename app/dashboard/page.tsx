import { sb } from '@/lib/supabase'
import OccupancyChart from '@/components/OccupancyChart'
import Link from 'next/link'
export default async function Dash() {
  const s = await sb(); const { data: { user } } = await s.auth.getUser()
  const { data: me } = await s.from('profiles').select('role,full_name').eq('id', user!.id).single()
  if (me?.role === 'patient') {
    const { data: pt } = await s.from('patients').select('id').eq('profile_id', user!.id).single()
    return <div className="card">Welcome, {me.full_name}. <Link className="underline text-brand-700" href={`/patients/${pt?.id}`}>Open my record</Link></div>
  }
  const [{ count: pts }, { count: fever }, { data: beds }, { data: hs }] = await Promise.all([
    s.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'admitted'),
    s.from('vitals').select('*', { count: 'exact', head: true }).gte('temp_c', 38).gte('recorded_at', new Date(Date.now() - 864e5).toISOString()),
    s.from('beds').select('hospital_id,patient_id'), s.from('hospitals').select('id,name')])
  const chart = (hs ?? []).map(h => { const b = (beds ?? []).filter(x => x.hospital_id === h.id); const o = b.filter(x => x.patient_id).length; return { name: h.name, occupied: o, free: b.length - o } })
  return (<div className="space-y-6"><h1 className="text-2xl font-semibold">Overview</h1>
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="card"><p className="text-sm text-slate-500">Admitted patients</p><p className="text-3xl font-semibold">{pts ?? 0}</p></div>
      <div className="card"><p className="text-sm text-slate-500">Fever readings (24h, ≥38°C)</p><p className="text-3xl font-semibold text-red-600">{fever ?? 0}</p></div>
      <div className="card"><p className="text-sm text-slate-500">Beds free</p><p className="text-3xl font-semibold">{chart.reduce((a, c) => a + c.free, 0)}</p></div></div>
    <div className="card"><h2 className="font-medium mb-3">Bed occupancy by hospital</h2><OccupancyChart data={chart} /></div></div>)
}
