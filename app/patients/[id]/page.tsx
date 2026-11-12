import { sb } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { notFound } from 'next/navigation'
export default async function Patient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const s = await sb()
  const { data: { user } } = await s.auth.getUser()
  const { data: me } = await s.from('profiles').select('role').eq('id', user!.id).single()
  const { data: p } = await s.from('patients').select('*').eq('id', id).single(); if (!p) notFound()
  const [{ data: v }, { data: n }, { data: rec }] = await Promise.all([
    s.from('vitals').select('*').eq('patient_id', id).order('recorded_at', { ascending: false }).limit(20),
    s.from('notes').select('*,profiles(full_name,role)').eq('patient_id', id).order('created_at', { ascending: false }),
    s.rpc('fever_free_days', { pid: id })])
  const staff = me?.role !== 'patient'
  async function addVital(f: FormData) { 'use server'; const c = await sb(); const { data: { user } } = await c.auth.getUser()
    const { error } = await c.from('vitals').insert({ patient_id: id, recorded_by: user!.id, temp_c: Number(f.get('temp')), pulse: Number(f.get('pulse')) || null, spo2: Number(f.get('spo2')) || null })
    if (error) throw new Error(error.message); revalidatePath(`/patients/${id}`) }
  async function addNote(f: FormData) { 'use server'; const c = await sb(); const { data: { user } } = await c.auth.getUser()
    const { error } = await c.from('notes').insert({ patient_id: id, author_id: user!.id, kind: String(f.get('kind')), body: String(f.get('body')) })
    if (error) throw new Error(error.message); revalidatePath(`/patients/${id}`) }
  async function recommend() { 'use server'; const c = await sb()
    const { error } = await c.rpc('recommend_discharge', { pid: id }); if (error) throw new Error(error.message); revalidatePath(`/patients/${id}`) }
  return (<div className="space-y-6">
    <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{p.full_name}</h1><span className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-1">{p.status}</span></div>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card"><p className="text-sm text-slate-500">Fever-free full days</p><p className="text-3xl font-semibold">{rec ?? 0} / 3</p>
        {me?.role === 'doctor' && Number(rec) >= 3 && p.status === 'admitted' && <form action={recommend}><button className="btn mt-3">Recommend discharge</button></form>}</div>
      <div className="card md:col-span-2 text-sm"><b>Allergies:</b> {p.allergies || 'None recorded'}<br /><b>History:</b> {p.medical_history || '—'}<br /><b>Emergency contact:</b> {p.emergency_contact || '—'}</div></div>
    {staff && me?.role !== 'doctor' || me?.role === 'doctor' ? <form action={addVital} className="card flex flex-wrap gap-2 items-end">
      <label className="text-sm">Temp °C<input name="temp" type="number" step="0.1" required className="inp" /></label><label className="text-sm">Pulse<input name="pulse" type="number" className="inp" /></label><label className="text-sm">SpO₂ %<input name="spo2" type="number" className="inp" /></label><button className="btn">Record vitals</button></form> : null}
    <div className="card p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500 border-b"><tr><th className="p-3">Time</th><th>Temp</th><th>Pulse</th><th>SpO₂</th></tr></thead><tbody>
      {(v ?? []).map((x: any) => <tr key={x.id} className="border-b last:border-0"><td className="p-3">{new Date(x.recorded_at).toLocaleString()}</td><td className={x.temp_c >= 38 ? 'text-red-600 font-semibold' : ''}>{x.temp_c}{x.temp_c >= 38 && ' ⚠ fever'}</td><td>{x.pulse ?? '—'}</td><td>{x.spo2 ?? '—'}</td></tr>)}</tbody></table></div>
    {(me?.role === 'doctor' || me?.role === 'nurse') && <form action={addNote} className="card space-y-2"><select name="kind" className="inp max-w-40">{me.role === 'doctor' ? <><option>clinical</option><option>treatment_plan</option></> : <><option>nursing</option><option>handover</option></>}</select><textarea name="body" required className="inp" rows={3} placeholder="Note" /><button className="btn">Add note</button></form>}
    <div className="space-y-2">{(n ?? []).map((x: any) => <div key={x.id} className="card text-sm"><p className="text-slate-500">{x.profiles?.full_name} ({x.profiles?.role}) · {x.kind} · {new Date(x.created_at).toLocaleString()}</p><p>{x.body}</p></div>)}</div></div>)
}
