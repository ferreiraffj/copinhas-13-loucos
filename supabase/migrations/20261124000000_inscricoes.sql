begin;

create schema if not exists copinha_private;
revoke all on schema copinha_private from public, anon, authenticated;

create table copinha_private.organizers (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.tournament_settings (
  id integer primary key default 1 check (id = 1),
  edit_deadline timestamptz not null,
  revision integer not null default 1
);

insert into public.tournament_settings (edit_deadline)
values ('2026-12-10 23:59:59-03');

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 2 and 80),
  representative_name text not null check (char_length(representative_name) between 3 and 90),
  representative_phone text not null check (representative_phone ~ '^[1-9][0-9]{9,10}$'),
  players jsonb not null check (jsonb_typeof(players) = 'array'),
  status text not null default 'pending' check (status in ('confirmed', 'pending', 'ineligible')),
  revision integer not null default 1,
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.tournament_settings enable row level security;
alter table public.registrations enable row level security;

revoke all on public.tournament_settings, public.registrations from public, anon, authenticated;
grant select on public.tournament_settings to anon, authenticated;
grant select on public.registrations to authenticated;

create function public.is_master()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'is_anonymous', 'true') = 'false'
    and exists (
      select 1 from copinha_private.organizers where user_id = auth.uid()
    );
$$;

create policy settings_read on public.tournament_settings
for select to anon, authenticated using (true);

create policy registrations_read on public.registrations
for select to authenticated
using (owner_id = (select auth.uid()) or (select public.is_master()));

create function public.save_registration(
  p_team_name text, p_representative text, p_phone text,
  p_players jsonb, p_revision integer
)
returns public.registrations
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  deadline timestamptz;
  current_registration public.registrations;
  clean_team text := btrim(coalesce(p_team_name, ''));
  clean_name text := btrim(coalesce(p_representative, ''));
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  clean_players jsonb;
  player jsonb;
  oldest_count integer;
  distinct_count integer;
begin
  if caller is null then
    raise exception using message = 'Entre para salvar sua inscrição.', errcode = '42501';
  end if;

  -- Keep the deadline and the write in the same transaction.
  select edit_deadline into deadline from public.tournament_settings where id = 1 for share;
  if deadline is null or clock_timestamp() >= deadline then
    raise exception 'O prazo de inscrição e edição já encerrou.';
  end if;

  if char_length(clean_team) not between 2 and 80
    or char_length(clean_name) not between 3 and 90
    or clean_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'Confira o nome da equipe, o representante e o WhatsApp com DDD.';
  end if;

  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Informe o elenco.';
  end if;
  if jsonb_array_length(p_players) not between 5 and 15 then
    raise exception 'A equipe precisa ter de 5 a 15 atletas.';
  end if;

  for player in select value from jsonb_array_elements(p_players) loop
    if coalesce(jsonb_typeof(player->'name'), '') <> 'string'
      or char_length(btrim(player->>'name')) not between 3 and 90
      or btrim(player->>'name') !~ '[^[:space:]][[:space:]]+[^[:space:]]'
      or coalesce(jsonb_typeof(player->'year'), '') <> 'number'
      or coalesce(player->>'year', '') !~ '^(2011|2012|2013|2014)$' then
      raise exception 'Informe o nome completo e um ano de nascimento válido para cada atleta.';
    end if;
  end loop;

  select
    jsonb_agg(jsonb_build_object(
      'name', regexp_replace(btrim(value->>'name'), '[[:space:]]+', ' ', 'g'),
      'year', (value->>'year')::integer
    ) order by ordinality),
    count(*) filter (where value->>'year' = '2011'),
    count(distinct (lower(regexp_replace(btrim(value->>'name'), '[[:space:]]+', ' ', 'g')), value->>'year'))
  into clean_players, oldest_count, distinct_count
  from jsonb_array_elements(p_players) with ordinality;
  if oldest_count > 2 then
    raise exception 'O elenco pode ter até dois atletas nascidos em 2011.';
  end if;
  if distinct_count <> jsonb_array_length(p_players) then
    raise exception 'Há atletas repetidos na relação.';
  end if;

  select * into current_registration from public.registrations where owner_id = caller for update;
  if clock_timestamp() >= deadline then
    raise exception 'O prazo de inscrição e edição já encerrou.';
  end if;
  if not found then
    if p_revision is distinct from 0 then
      raise exception 'A inscrição mudou. Atualize a página antes de salvar.';
    end if;
    insert into public.registrations (owner_id, team_name, representative_name, representative_phone, players)
    values (caller, clean_team, clean_name, clean_phone, clean_players)
    on conflict (owner_id) do nothing
    returning * into current_registration;
  else
    if current_registration.revision is distinct from p_revision then
      raise exception 'A inscrição mudou. Atualize a página antes de salvar.';
    end if;
    update public.registrations
    set team_name = clean_team, representative_name = clean_name, representative_phone = clean_phone,
        players = clean_players, revision = revision + 1, updated_at = clock_timestamp(),
        status = case
          when status = 'confirmed'
            and (players <> clean_players or team_name <> clean_team) then 'pending'
          else status
        end
    where owner_id = caller
    returning * into current_registration;
  end if;
  if current_registration.id is null then
    raise exception 'A inscrição mudou. Atualize a página antes de salvar.';
  end if;
  return current_registration;
end;
$$;

create function public.set_registration_status(p_id uuid, p_status text, p_revision integer)
returns public.registrations
language plpgsql security definer set search_path = ''
as $$
declare
  registration public.registrations;
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if p_status is null or p_status not in ('confirmed', 'pending', 'ineligible') then
    raise exception 'Selecione um status válido.';
  end if;
  update public.registrations
  set status = p_status, revision = revision + 1, updated_at = clock_timestamp()
  where id = p_id and revision = p_revision
  returning * into registration;
  if not found then
    raise exception 'A inscrição mudou. Recarregue o painel e confira o elenco antes de alterar o status.';
  end if;
  return registration;
end;
$$;

create function public.set_edit_deadline(p_deadline timestamptz, p_revision integer)
returns public.tournament_settings
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.tournament_settings;
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if p_deadline is null or not isfinite(p_deadline) then
    raise exception 'Informe um prazo válido.';
  end if;
  update public.tournament_settings
  set edit_deadline = p_deadline, revision = revision + 1
  where id = 1 and revision = p_revision
  returning * into settings;
  if not found then
    raise exception 'O prazo mudou. Recarregue o painel antes de salvar.';
  end if;
  return settings;
end;
$$;

revoke all on function public.is_master() from public, anon, authenticated;
revoke all on function public.save_registration(text, text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.set_registration_status(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.set_edit_deadline(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.is_master() to authenticated;
grant execute on function public.save_registration(text, text, text, jsonb, integer) to authenticated;
grant execute on function public.set_registration_status(uuid, text, integer) to authenticated;
grant execute on function public.set_edit_deadline(timestamptz, integer) to authenticated;

commit;
