begin;

alter table public.tournament_settings
  add column if not exists contact_instagram text,
  add column if not exists contact_email text;

alter table public.tournament_settings
  add constraint tournament_settings_contact_instagram_check
    check (contact_instagram is null or contact_instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint tournament_settings_contact_email_check
    check (contact_email is null or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

-- Recreate the save function so existing databases also accept a single-word athlete name.
create or replace function public.save_registration(
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
      or coalesce(jsonb_typeof(player->'year'), '') <> 'number'
      or coalesce(player->>'year', '') !~ '^(2011|2012|2013|2014)$' then
      raise exception 'Informe o nome do atleta e um ano de nascimento válido para cada atleta.';
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
          when status = 'confirmed' and (players <> clean_players or team_name <> clean_team) then 'pending'
          else status
        end
    where owner_id = caller
    returning * into current_registration;
  end if;
  if current_registration.id is null then
    raise exception 'A inscrição mudou. Recarregue a página antes de salvar.';
  end if;
  return current_registration;
end;
$$;

create or replace function public.save_organizer_contact(
  p_phone text, p_instagram text, p_email text, p_revision integer
)
returns public.tournament_settings
language plpgsql security definer set search_path = '' as $$
declare
  settings public.tournament_settings;
  clean_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  clean_instagram text := nullif(regexp_replace(btrim(coalesce(p_instagram, '')), '^@+', ''), '');
  clean_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if clean_phone is not null and clean_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'Informe um WhatsApp válido com DDD.';
  end if;
  if clean_instagram is not null and clean_instagram !~ '^[A-Za-z0-9._]{1,30}$' then
    raise exception 'Informe um Instagram válido.';
  end if;
  if clean_email is not null and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido.';
  end if;
  update public.tournament_settings
    set contact_phone = clean_phone,
        contact_instagram = clean_instagram,
        contact_email = clean_email,
        revision = revision + 1
    where id = 1 and revision = p_revision
    returning * into settings;
  if not found then
    raise exception 'As configurações mudaram. Recarregue o painel antes de salvar.';
  end if;
  return settings;
end;
$$;

revoke all on function public.save_organizer_contact(text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.save_organizer_contact(text, text, text, integer)
  to authenticated;

notify pgrst, 'reload schema';
commit;
