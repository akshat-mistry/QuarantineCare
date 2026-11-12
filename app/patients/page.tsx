import { sb } from '@/lib/supabase'
import Link from 'next/link'
export default async function Patients({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams; const s = await sb()
  let qb = s.from('patients').select('id,full_name,status,admitted_at,beds(room,label)').order('full_name')
  if (q) qb = qb.ilike('full_name', `%${q}%`); if (status) qb = qb.eq('status', status)
  const { data, error } = await qb
  return (<div className="space-y-4"><h1 className="text-2xl font-semibold">Patients</h1>
    <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search name" className="inp max-w-xs" />
      <select name="status" defaultValue={status ?? ''} className="inp max-w-40"><option value="">All</option><option>admitted</option><option>discharge_recommended</option><option>discharged</option></select><button className="btn">Filter</button></form>
    {error && <p className="text-red-600">{error.message}</p>}
    <div className="card p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500 border-b"><tr><th className="p-3">Name</th><th>Status</th><th>Bed</th><th>Admitted</th></tr></thead><tbody>
      {(data ?? []).map((p: any) => <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3"><Link className="text-brand-700 font-medium" href={`/patients/${p.id}`}>{p.full_name}</Link></td><td>{p.status}</td><td>{p.beds?.[0] ? `${p.beds[0].room}-${p.beds[0].label}` : '—'}</td><td>{new Date(p.admitted_at).toLocaleDateString()}</td></tr>)}
    </tbody></table></div></div>)
}
