begin;

alter table public.registrations
  add column if not exists team_instagram text,
  add column if not exists representative_instagram text;

create or replace function public.save_registration_with_instagram(
  p_team_name text,
  p_representative text,
  p_phone text,
  p_players jsonb,
  p_revision integer,
  p_logo text,
  p_team_instagram text,
  p_representative_instagram text
)
returns public.registrations
language plpgsql security definer set search_path = '' as $$
declare
  registration public.registrations;
  clean_team_instagram text := nullif(regexp_replace(btrim(coalesce(p_team_instagram, '')), '^@+', ''), '');
  clean_representative_instagram text := nullif(regexp_replace(btrim(coalesce(p_representative_instagram, '')), '^@+', ''), '');
begin
  perform copinha_private.validate_logo(p_logo);

  if clean_team_instagram is not null
    and clean_team_instagram !~ '^[A-Za-z0-9._]{1,30}$'
    or clean_representative_instagram is not null
    and clean_representative_instagram !~ '^[A-Za-z0-9._]{1,30}$' then
    raise exception 'Informe um Instagram válido ou deixe o campo em branco.';
  end if;

  select * into registration from public.save_registration_with_logo(
    p_team_name, p_representative, p_phone, p_players, p_revision, p_logo
  );

  update public.registrations
  set team_instagram = clean_team_instagram,
      representative_instagram = clean_representative_instagram
  where id = registration.id
  returning * into registration;

  return registration;
end;
$$;

revoke all on function public.save_registration_with_instagram(
  text, text, text, jsonb, integer, text, text, text
) from public, anon, authenticated;

grant execute on function public.save_registration_with_instagram(
  text, text, text, jsonb, integer, text, text, text
) to authenticated;

notify pgrst, 'reload schema';
commit;
