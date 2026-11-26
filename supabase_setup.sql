-- Esegui questo script su Supabase -> SQL Editor -> New Query -> Run
-- (si può rieseguire: aggiorna le funzioni senza toccare i dati).
--
-- Mantiene la stessa tabella `public.study_state`, ma blocca l'accesso diretto
-- via REST (impedendo `SELECT *` sulla tabella) esponendo solo due RPC protette
-- che operano esclusivamente sulla `sync_key` fornita.
-- La `sync_key` è l'unico segreto: deve avere almeno 24 caratteri (meglio se
-- generata casualmente dall'app) e non va mai pubblicata in `config.js`.
--
-- Concorrenza: `updated_at` fa da versione della riga. L'app scarica la riga, unisce
-- i dati e ricarica dichiarando la versione da cui è partita (`p_expected_updated_at`):
-- se nel frattempo un altro dispositivo ha salvato, la scrittura viene rifiutata
-- (ritorna false) e l'app riscarica e riprova, invece di sovrascrivere.

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
  if p_sync_key is null or length(trim(p_sync_key)) < 24 then
    raise exception 'Invalid sync_key';
  end if;

  return query
  select s.payload, s.updated_at
  from public.study_state s
  where s.sync_key = trim(p_sync_key)
  limit 1;
end;
$$;

-- RPC 2: scrive solo la riga corrispondente alla sync_key esatta.
--   p_check = false -> sovrascrive sempre (pulsante "Invia (forza)" e vecchie versioni dell'app)
--   p_check = true  -> scrive solo se la riga è ancora alla versione p_expected_updated_at
--                      (null = la riga non deve ancora esistere). Ritorna false se rifiutata.
-- updated_at è assegnato dal server, così ogni scrittura produce una versione nuova.
drop function if exists public.upsert_study_state(text, jsonb, timestamptz);

create or replace function public.upsert_study_state(
  p_sync_key text,
  p_payload jsonb,
  p_updated_at timestamptz default null,        -- non più usato, tenuto per compatibilità
  p_expected_updated_at timestamptz default null,
  p_check boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(p_sync_key);
  v_rows integer;
begin
  if p_sync_key is null or length(v_key) < 24 then
    raise exception 'Invalid sync_key';
  end if;

  if not coalesce(p_check, false) then
    insert into public.study_state (sync_key, payload, updated_at)
    values (v_key, p_payload, clock_timestamp())
    on conflict (sync_key) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;
    return true;
  end if;

  if p_expected_updated_at is null then
    insert into public.study_state (sync_key, payload, updated_at)
    values (v_key, p_payload, clock_timestamp())
    on conflict (sync_key) do nothing;
  else
    update public.study_state
    set payload = p_payload,
        updated_at = clock_timestamp()
    where sync_key = v_key
      and updated_at = p_expected_updated_at;
  end if;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.get_study_state(text) to anon, authenticated;
grant execute on function public.upsert_study_state(text, jsonb, timestamptz, timestamptz, boolean) to anon, authenticated;
