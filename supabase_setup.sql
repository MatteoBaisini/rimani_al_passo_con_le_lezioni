-- Esegui questo script su Supabase -> SQL Editor -> New Query -> Run
-- Mantiene la stessa tabella `public.study_state`, ma blocca l'accesso diretto
-- via REST (impedendo `SELECT *` sulla tabella) esponendo solo due RPC protette
-- che operano esclusivamente sulla `sync_key` fornita.

create table if not exists public.study_state (
  sync_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Abilita Row Level Security e rimuove eventuali vecchie policy permissive
alter table public.study_state enable row level security;

drop policy if exists "Allow read by sync_key" on public.study_state;
drop policy if exists "Allow insert by sync_key" on public.study_state;
drop policy if exists "Allow update by sync_key" on public.study_state;

-- Revoca l'accesso diretto alla tabella al ruolo anon (nessun dump possibile)
revoke all on table public.study_state from anon, authenticated;

-- RPC 1: legge solo la riga corrispondente alla sync_key esatta
create or replace function public.get_study_state(p_sync_key text)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sync_key is null or length(trim(p_sync_key)) < 4 then
    raise exception 'Invalid sync_key';
  end if;

  return query
  select s.payload, s.updated_at
  from public.study_state s
  where s.sync_key = trim(p_sync_key)
  limit 1;
end;
$$;

-- RPC 2: inserisce o aggiorna solo la riga corrispondente alla sync_key esatta
create or replace function public.upsert_study_state(
  p_sync_key text,
  p_payload jsonb,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sync_key is null or length(trim(p_sync_key)) < 4 then
    raise exception 'Invalid sync_key';
  end if;

  insert into public.study_state (sync_key, payload, updated_at)
  values (trim(p_sync_key), p_payload, coalesce(p_updated_at, now()))
  on conflict (sync_key) do update
  set payload = excluded.payload,
      updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.get_study_state(text) to anon, authenticated;
grant execute on function public.upsert_study_state(text, jsonb, timestamptz) to anon, authenticated;
