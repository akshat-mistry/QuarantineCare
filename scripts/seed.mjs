import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const PW = 'Demo@12345'
const F = ['Aarav','Meera','Rohan','Ananya','Kabir','Ishita','Vikram','Neha','Arjun','Priya'], L = ['Sharma','Iyer','Kulkarni','Nair','Mehta','Reddy','Joshi','Desai','Gupta','Menon']
const nm = i => `${F[i % 10]} ${L[(i * 3 + 1) % 10]}`
const mk = async (email, role, name, hid) => {
  const { data, error } = await s.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error
  const { error: e2 } = await s.from('profiles').insert({ id: data.user.id, role, full_name: name, hospital_id: hid }); if (e2) throw e2; return data.user.id }
const { data: hs, error } = await s
  .from('hospitals')
  .insert([
    { name: 'Lakeview General' },
    { name: 'St. Marren Medical' },
    { name: 'Harbor City Hospital' }
  ])
  .select();

if (error) {
  console.error("HOSPITAL INSERT ERROR:", error);
  process.exit(1);
}

console.log("Hospitals created:", hs);const beds = {}
for (const h of hs) { const { data } = await s.from('beds').insert(Array.from({ length: 8 }, (_, i) => ({ hospital_id: h.id, room: `R${1 + (i >> 1)}`, label: `B${(i % 2) + 1}` }))).select(); beds[h.id] = data }
await mk('super@quarantinecare.demo', 'super_admin', 'Asha Verma', null)
for (let i = 0; i < 3; i++) await mk(`admin${i + 1}@quarantinecare.demo`, 'hospital_admin', `Admin ${nm(i)}`, hs[i].id)
const docs = [], nurses = []
for (let i = 0; i < 8; i++) docs.push({ id: await mk(`doctor${i + 1}@quarantinecare.demo`, 'doctor', `Dr. ${nm(i + 2)}`, hs[i % 3].id), h: hs[i % 3].id })
for (let i = 0; i < 12; i++) nurses.push({ id: await mk(`nurse${i + 1}@quarantinecare.demo`, 'nurse', `Nurse ${nm(i + 5)}`, hs[i % 3].id), h: hs[i % 3].id })
for (let i = 0; i < 16; i++) {
  const h = hs[i % 3], uid = await mk(`patient${i + 1}@quarantinecare.demo`, 'patient', nm(i + 7), h.id)
  const { data: p } = await s.from('patients').insert({ profile_id: uid, hospital_id: h.id, full_name: nm(i + 7), allergies: i % 3 ? 'None' : 'Penicillin', medical_history: 'Seasonal viral infection under observation', emergency_contact: `Family contact +91 98000 000${String(i).padStart(2, '0')}`, admitted_at: new Date(Date.now() - 6 * 864e5).toISOString() }).select().single()
  const bed = beds[h.id].shift(); await s.from('beds').update({ patient_id: p.id }).eq('id', bed.id)
  const d = docs.find(x => x.h === h.id), n = nurses.find(x => x.h === h.id && !(i % 2)) ?? nurses.find(x => x.h === h.id)
  await s.from('assignments').insert([{ patient_id: p.id, staff_id: d.id }, { patient_id: p.id, staff_id: n.id }])
  const v = []
  for (let day = 5; day >= 0; day--) for (const hr of [8, 20]) {
    const t = new Date(Date.now() - day * 864e5); t.setHours(hr, 0, 0, 0)
    const feverish = i % 4 === 0 || day > 3
    v.push({ patient_id: p.id, recorded_by: n.id, temp_c: +(feverish ? 37.9 + Math.random() * 1.3 : 36.5 + Math.random() * 0.7).toFixed(1), pulse: 68 + Math.floor(Math.random() * 25), spo2: 94 + Math.floor(Math.random() * 5), recorded_at: t.toISOString() }) }
  await s.from('vitals').insert(v)
  await s.from('notes').insert({ patient_id: p.id, author_id: d.id, kind: 'clinical', body: 'Admitted for observation. Supportive care, monitor temperature twice daily.' })
}
console.log('Seeded 40 users. Password for all: ' + PW)
