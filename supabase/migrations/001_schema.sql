create table hospitals(id uuid primary key default gen_random_uuid(), name text not null);
create table profiles(id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('super_admin','hospital_admin','doctor','nurse','patient')),
  full_name text not null, hospital_id uuid references hospitals);
create table patients(id uuid primary key default gen_random_uuid(), profile_id uuid references profiles,
  hospital_id uuid not null references hospitals, full_name text not null, dob date,
  allergies text, medical_history text, emergency_contact text,
  status text not null default 'admitted' check (status in ('admitted','discharge_recommended','discharged')),
  admitted_at timestamptz not null default now(), discharged_at timestamptz);
create table beds(id uuid primary key default gen_random_uuid(), hospital_id uuid not null references hospitals,
  room text not null, label text not null, patient_id uuid unique references patients on delete set null);
create table assignments(patient_id uuid references patients on delete cascade, staff_id uuid references profiles on delete cascade, primary key(patient_id,staff_id));
create table vitals(id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients on delete cascade,
  recorded_by uuid not null references profiles, temp_c numeric(3,1) not null check (temp_c between 30 and 45),
  pulse int, spo2 int, recorded_at timestamptz not null default now());
create table notes(id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients on delete cascade,
  author_id uuid not null references profiles, kind text not null, body text not null, created_at timestamptz not null default now());
create table audit_logs(id bigint generated always as identity primary key, actor uuid, action text, entity text, entity_id uuid, at timestamptz default now());
create index on vitals(patient_id, recorded_at desc); create index on notes(patient_id, created_at desc);

create function my_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() $$;
create function my_hosp() returns uuid language sql stable security definer set search_path=public as $$ select hospital_id from profiles where id=auth.uid() $$;
create function can_see(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from patients p where p.id=pid and (
    my_role()='super_admin'
    or (my_role()='hospital_admin' and p.hospital_id=my_hosp())
    or (my_role() in ('doctor','nurse') and exists(select 1 from assignments a where a.patient_id=p.id and a.staff_id=auth.uid()))
    or p.profile_id=auth.uid())) $$;

-- Fever-free = last 3 complete calendar days (excluding today) each have readings, all < 38.0C
create function fever_free_days(pid uuid) returns int language sql stable security definer set search_path=public as $$
  select case when can_see(pid) then (select count(*)::int from (
    select recorded_at::date d from vitals where patient_id=pid and recorded_at::date < current_date and recorded_at::date >= current_date-3
    group by 1 having max(temp_c) < 38.0) t) else 0 end $$;
create function recommend_discharge(pid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if my_role()<>'doctor' or not can_see(pid) then raise exception 'not allowed'; end if;
  if fever_free_days(pid) < 3 then raise exception 'needs 3 full fever-free days'; end if;
  update patients set status='discharge_recommended' where id=pid and status='admitted';
  insert into audit_logs(actor,action,entity,entity_id) values(auth.uid(),'recommend_discharge','patient',pid);
end $$;

alter table hospitals enable row level security; alter table profiles enable row level security; alter table patients enable row level security;
alter table beds enable row level security; alter table assignments enable row level security; alter table vitals enable row level security;
alter table notes enable row level security; alter table audit_logs enable row level security;
create policy h_sel on hospitals for select using (my_role()='super_admin' or id=my_hosp());
create policy pr_sel on profiles for select using (id=auth.uid() or my_role()='super_admin' or hospital_id=my_hosp());
create policy pt_sel on patients for select using (can_see(id));
create policy pt_ins on patients for insert with check (my_role()='super_admin' or (my_role()='hospital_admin' and hospital_id=my_hosp()));
create policy pt_upd on patients for update using (my_role()='super_admin' or (my_role()='hospital_admin' and hospital_id=my_hosp()));
create policy bd_sel on beds for select using (my_role()='super_admin' or (my_role()<>'patient' and hospital_id=my_hosp()));
create policy bd_mod on beds for all using (my_role()='super_admin' or (my_role()='hospital_admin' and hospital_id=my_hosp()));
create policy as_sel on assignments for select using (staff_id=auth.uid() or can_see(patient_id));
create policy as_mod on assignments for all using (my_role() in ('super_admin','hospital_admin'));
create policy vt_sel on vitals for select using (can_see(patient_id));
create policy vt_ins on vitals for insert with check (recorded_by=auth.uid() and my_role() in ('nurse','doctor','hospital_admin') and can_see(patient_id));
create policy nt_sel on notes for select using (can_see(patient_id));
create policy nt_ins on notes for insert with check (author_id=auth.uid() and my_role() in ('doctor','nurse') and can_see(patient_id));
create policy au_sel on audit_logs for select using (my_role() in ('super_admin','hospital_admin'));
