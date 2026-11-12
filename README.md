# QuarantineCare (core build)
Next.js 15 + TypeScript + Tailwind + Supabase (Auth, Postgres, RLS) + Recharts.

## Setup
1. Create a Supabase project. In SQL Editor run `supabase/migrations/001_schema.sql`.
2. `cp .env.example .env.local` and fill in the three keys (Project Settings > API).
3. `npm install && npm run seed && npm run dev` -> http://localhost:3000

## Demo logins (password for all: `Demo@12345`)
super@quarantinecare.demo | admin1-3@ | doctor1-8@ | nurse1-12@ | patient1-16@ (all `@quarantinecare.demo`)
Change these passwords before any real deployment; the seed is for demos only.

## Deploy to Vercel
Import the repo, add the 3 env vars (service role key is only needed for seeding; omit it on Vercel), deploy.

## Implemented
- Auth (email/password), middleware route protection, 5 roles in `profiles`
- RLS on every table: patients see only themselves; doctors/nurses only assigned patients; hospital admins only their hospital; super admin all
- Patients list with search/status filter; patient record with allergies, history, emergency contact
- Vitals entry (nurse/doctor/admin) with fever alert (>=38.0C); doctor/nurse notes with author + timestamp
- Fever-free tracking (3 complete days) computed in SQL; doctor discharge recommendation enforced server-side (RPC) and audit-logged
- Dashboard with live counts and bed-occupancy chart from the database
- 40 seeded accounts, 3 hospitals, 24 beds, assignments, 12 readings per patient

## NOT implemented yet
- Admin UI to create users/patients, admit, allocate/transfer beds, process discharge (schema + RLS are ready; needs a server action using the service role)
- Super Admin hospital/permission management screens
- Prescriptions, photo/document uploads, Supabase Storage buckets and storage policies
- Tasks, notifications, audit log viewer (audit table exists; only discharge recommendation writes to it)
- Charts beyond occupancy (admissions, recovery, mortality, workload, trends); reports and CSV export
- Mortality status, handover reports, patient recovery view beyond the record page, tests, loading/error boundaries
- Not built or run-tested in my environment; expect small fixes on first `npm run build`.
