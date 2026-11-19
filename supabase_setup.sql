-- Esegui questo script UNA SOLA VOLTA su Supabase -> SQL Editor -> New Query -> Run

create table if not exists public.study_state (
  sync_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Abilita Row Level Security
alter table public.study_state enable row level security;

-- Policy per leggere/scrivere la propria riga tramite anon key (usa una SYNC_KEY personale non banale)
drop policy if exists "Allow read by sync_key" on public.study_state;
create policy "Allow read by sync_key"
  on public.study_state
  for select
  using (true);

drop policy if exists "Allow insert by sync_key" on public.study_state;
create policy "Allow insert by sync_key"
  on public.study_state
  for insert
  with check (true);

drop policy if exists "Allow update by sync_key" on public.study_state;
create policy "Allow update by sync_key"
  on public.study_state
  for update
  using (true)
  with check (true);
